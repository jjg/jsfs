// jsfs - Javascript filesystem with a REST interface

// *** CONVENTIONS ***
// strings are double-quoted, variables use underscores, constants are ALL CAPS

// *** GLOBALS ***
// the plan is to eliminate these eventually...
var stored_files = {};

// *** UTILITIES  & MODULES ***
var http = require("http");
var crypto = require("crypto");
var fs = require("fs");
var config = require('./config.js');

// these may be broken-out into individual files once they have been debugged
// general-purpose logging facility
var log = {
	INFO: 0,
	WARN: 1,
	ERROR: 2,
	level: 0, // default log level
	message: function(severity, log_message){
		if(severity >= this.level){
			console.log(Date() + "\t" + severity + "\t" + log_message);
		}
	}
};

function save_metadata(){
	fs.writeFile(config.STORAGE_PATH + "metadata.json", JSON.stringify(stored_files), function(err){
		if(err){
			log.message(log.ERROR, "error saving metadata to disk");
		} else {
			log.message(log.INFO, "metadata saved to disk");
		}
	});

	var stats = system_stats();
	log.message(log.INFO, stats.file_count + " files stored in " + stats.block_count + " blocks");
}

function load_metadata(){
	try{
		stored_files = JSON.parse(fs.readFileSync(config.STORAGE_PATH + "metadata.json"));
		log.message(log.INFO, "metadata loaded from disk");
	} catch(ex) {
		log.message(log.WARN, "unable to load metadata from disk: " + ex);
	}

	var stats = system_stats();
	log.message(log.INFO, stats.file_count + " files stored in " + stats.block_count + " blocks");
}

function system_stats(){

	var stats = {};
	stats.file_count = 0;
	stats.block_count = 0;

	for(var file in stored_files){
		if(stored_files.hasOwnProperty(file)){	
			// count blocks
			stats.block_count = stats.block_count + stored_files[file].blocks.length;

			// increment file count
			stats.file_count++;
		}
	}

	return stats;
}

// simple encrypt-decrypt functions
function encrypt(block, key){
	var cipher = crypto.createCipher("aes-256-cbc", key);
	cipher.write(block);
	cipher.end();
	return cipher.read();
}
 
function decrypt(block, key){
	var decipher = crypto.createDecipher("aes-256-cbc", key);
	decipher.write(block);
	decipher.end();
	return decipher.read();
} 

// base storage object
var file_store = {
	init: function(url){
		this.url = url;
		this.input_buffer = new Buffer("");
		this.block_size = config.BLOCK_SIZE;
		this.file_metadata = {};
		this.file_metadata.created = (new Date()).getTime();
		this.file_metadata.version = 0;	// todo: use a function to check for previous versions
		this.file_metadata.private = false;
		this.file_metadata.encrypted = false;
		this.file_metadata.access_token = null;
		this.file_metadata.content_type = "application/octet-stream";
		this.file_metadata.file_size = 0;
		this.file_metadata.block_size = this.block_size;
		this.file_metadata.blocks = [];
	},
	write: function(chunk){
		this.input_buffer = new Buffer.concat([this.input_buffer, chunk]);
		this.process_buffer();
	},
	close: function(){
		this.process_buffer(true);

		// add signature to metadata (used as auth token for update operations)
		if(!this.file_metadata.access_token){
			shasum = crypto.createHash("sha1");
			shasum.update(JSON.stringify(this.file_metadata));
			this.file_metadata.access_token =  shasum.digest("hex");
		}

		// add file to storage metadata
		stored_files[this.url] = this.file_metadata;

		// write updated metadata to disk
		save_metadata();

		// return metadata for future operations
		return this.file_metadata;
	},
	process_buffer: function(flush){

		if(flush){

			log.message(0, "flushing remaining buffer");

			// update original file size
			this.file_metadata.file_size = this.file_metadata.file_size + this.input_buffer.length;

			// empty the remainder of the buffer
			while(this.input_buffer.length > 0){
				this.store_block();
			}

		} else {

			while(this.input_buffer.length > this.block_size){

				// update original file size
				this.file_metadata.file_size = this.file_metadata.file_size + this.block_size;

				this.store_block();
			}
		}
	},
	store_block: function(){

		// grab the next block
		var block = this.input_buffer.slice(0, this.block_size);

		// generate a hash of the block to use as a handle/filename
		var block_hash = null;
		shasum = crypto.createHash("sha1");
		shasum.update(block);
		block_hash = shasum.digest("hex");

		// if encryption is set, encrypt using the hash above
		if(this.file_metadata.encrypted){
			log.message(log.INFO, "encrypting block");
			block = encrypt(block, block_hash);
		}

		// save the block to disk
		var block_file = config.STORAGE_PATH + block_hash;
		if(!fs.existsSync(block_file)){
			log.message(log.INFO, "storing block " + block_file);
		} else {
			log.message(log.INFO, "duplicate block " + block_hash);
		}

		fs.writeFileSync(block_file, block, "binary");
		this.file_metadata.blocks.push(block_hash);
		this.input_buffer = this.input_buffer.slice(this.block_size);
	}
};


// *** CONFIGURATION ***
log.level = config.LOG_LEVEL;	// the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error


// *** INIT ***
load_metadata();


// at the highest level, jsfs is an HTTP server that accepts GET, POST, PUT, DELETE and OPTIONS methods
http.createServer(function(req, res){

	// all responses include these headers to support cross-domain requests
	var allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
	var allowed_headers = ["Accept", "Accept-Version", "Content-Type", "Api-Version", "Origin", "X-Requested-With","Range","X_FILENAME","X-Access-Token", "X-Encrypted", "X-Private"];

	res.setHeader("Access-Control-Allow-Methods", allowed_methods.join(","));
	res.setHeader("Access-Control-Allow-Headers", allowed_headers.join(","));
	res.setHeader("Access-Control-Allow-Origin", "*");

	// all requests are interrorgated for these values
	var target_url = require("url").parse(req.url).pathname;
	log.message(log.INFO, "target_url: " + target_url);

	// host-based url shortcut expansion
	if(target_url.substring(0,2) === "/M"){
		log.message(log.INFO, "Attempting to expand host namespace shortcut");
		var host_header = req.headers["host"];
		if(host_header){
			log.message(log.INFO, "Found host header: " + host_header);
			var host_header_parts = host_header.split(":");
			var forward_host = host_header_parts[0].split(".");
			log.message(log.INFO, "forward_host: " + forward_host);
			var reversed_host = "";
			for(var i=(forward_host.length - 1);i>=0;i--){
				reversed_host = reversed_host + "." + forward_host[i];
			}
			log.message(log.INFO, "reversed_host: " + reversed_host);
			target_url = reversed_host + target_url.substring(1);
			log.message(log.INFO, "Expanded target_url: " + target_url);
		}
	}

	var content_type = req.headers["content-type"];
	var access_token = req.headers["x-access-token"];
	var private = req.headers["x-private"];
	var encrypted = req.headers["x-encrypted"];

	// debug
	console.log(req.headers);

	log.message(log.INFO, "Received " + req.method + " requeset for URL " + target_url);

	switch(req.method){

		case "GET":

			// if url ends in "/", return a list of public files 
			if(target_url.slice(-1) == "/"){

				var public_directory = [];

				for(var file in stored_files){
					if(stored_files.hasOwnProperty(file)){
						if(!stored_files[file].private && (file.indexOf(target_url) > -1)){
							
							// remove leading path from filename 
							file = file.slice(target_url.length);

							// remove trailing path from subdirectories
							if(file.indexOf("/") > -1){
								file = file.slice(0,(file.indexOf("/") + 1));
							}

							public_directory.push(file);
						}
					}
				}

				res.write(JSON.stringify(public_directory));
				res.end();

			} else {

				// return the file located at the requested URL 
				var requested_file = null;
		
				// check for existance of requested URL
				if(typeof stored_files[target_url] != "undefined"){

					requested_file = stored_files[target_url];

					// return status 200
					res.statusCode = 200;

					// check authorization of URL
					if(!requested_file.private || (requested_file.private && requested_file.access_token === access_token)){

						 // return file metadata as HTTP headers
						res.setHeader("Content-Type", requested_file.content_type);
		
						// return file blocks
						for(var i=0; i < requested_file.blocks.length; i++){
							var block_filename = config.STORAGE_PATH + requested_file.blocks[i];
							var block_data = fs.readFileSync(block_filename);

							if(requested_file.encrypted){
								log.message(log.INFO, "decrypting block");
								block_data = decrypt(block_data, requested_file.blocks[i]);
							}
		
							// send block to caller
							res.write(block_data);
						}
		
						// finish request
						res.end();

					} else {
						// return status 401
						res.statusCode = 401;
						res.end();
					}

				} else {
					// return status 404
					res.statusCode = 404;
					res.end();
				}
				}

			break;

		case "POST":

			// make sure the URL isn't already taken
			if(typeof stored_files[target_url] === "undefined"){

				// store the posted data at the specified URL
				var file_metadata = null; 
				var new_file = Object.create(file_store);
				new_file.init(target_url);
	
				// set additional file properties (content-type, etc.)
				if(content_type){
					log.message(log.INFO, "Content-Type: " + content_type);
					new_file.file_metadata.content_type = content_type;
				}
	
				if(private){
					new_file.file_metadata.private = true;
				}
	
				if(encrypted){
					new_file.file_metadata.encrypted = true;
				}

				// if access_token is supplied with POST, don't generate a new one
				if(access_token){
					new_file.file_metadata.access_token = access_token;
				}
	
				req.on("data", function(chunk){
					new_file.write(chunk);
				});
	
				req.on("end", function(){
					file_metadata = new_file.close();
					res.end(JSON.stringify(file_metadata));
				});

			} else {

				// if file exists at this URL, return 405 "Method not allowed"
				res.statusCode = 405;
				res.end();
			}
	
			break;

		case "PUT":

			// make sure there's a file to update
			if(typeof stored_files[target_url] != "undefined"){

				var original_file = stored_files[target_url];

				// check authorization
				if(original_file.access_token === access_token){

					// update the posted data at the specified URL
					var new_file = Object.create(file_store);
					new_file.init(target_url);
	
					// copy original file properties
					new_file.file_metadata.created = original_file.created;
					new_file.file_metadata.updated = (new Date()).getTime();
					new_file.file_metadata.access_token = access_token;
					new_file.file_metadata.content_type = original_file.content_type;
					new_file.file_metadata.private = original_file.private;
					new_file.file_metadata.encrypted = original_file.encrypted;

					// update file properties (if requested)
					if(content_type){
						log.message(log.INFO, "Content-Type: " + content_type);
						new_file.file_metadata.content_type = content_type;
					}

					if(private){
						new_file.file_metadata.private = true;
					}
	
					if(encrypted){
						new_file.file_metadata.encrypted = true;
					}

					req.on("data", function(chunk){
						new_file.write(chunk);
					});
	
					req.on("end", function(){
						var new_file_metadata = new_file.close();
						res.end(JSON.stringify(new_file_metadata));
 					});
		
					} else {
	
						// if token is invalid, return unauthorized
						res.statusCode = 401;
						res.end();
					}					
	
				} else {
	
					// if file dosen't exist at this URL, return 405 "Method not allowed"
					res.statusCode = 405;
					res.end();
				}

				break;

		case "DELETE":

			// remove the data stored at the specified URL 
      // make sure there's a file to remove 
      if(typeof stored_files[target_url] != "undefined"){

        var original_file = stored_files[target_url];

        // check authorization
        if(original_file.access_token === access_token){

					// unlink the url
					delete stored_files[target_url];

					save_metadata();
					res.end();

				} else {
					// if token is invalid, return unauthorized
					res.statusCode = 401;
					res.end();
				}
			} else {
				// if file doesn't exist, return method not allowed
				res.statusCode = 405;
				res.end();
			}

			break;

		case "HEAD":

			if(typeof stored_files[target_url] != "undefined"){
				var requested_file = stored_files[target_url];
				if(!requested_file.private || (requested_file.access_token === access_token)){
					res.writeHead(200,{
						"Content-Type": requested_file.content_type,
						"Content-Length": requested_file.file_size
					});
					res.end();
				} else {
					res.statusCode = 401;
					res.end();
				}
			} else {
				res.statusCode = 404;
				res.end();
			}

			break;

		 case "OPTIONS":

			// support for OPTIONS is required to support cross-domain requests (CORS)
			res.writeHead(204);
			res.end();

			break;

		default:
			res.writeHead(405);
			res.end("method " + req.method + " is not supported");
	}

	// log the result of the request
	log.message(log.INFO, "Result: " + res.statusCode);

}).listen(config.SERVER_PORT);
