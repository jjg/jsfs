// jsfs - Javascript filesystem with a REST interface

// *** CONVENTIONS ***
// strings are double-quoted, variables use underscores, constants are ALL CAPS

// *** GLOBALS ***
// the plan is to eliminate these eventually...
var superblock = {};
var storage_locations = {};

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

function save_superblock(){
	for(location in config.STORAGE_LOCATIONS){
		if(config.STORAGE_LOCATIONS.hasOwnProperty(location)){
			var storage_path = config.STORAGE_LOCATIONS[location].path;
		
			fs.writeFile(storage_path + "superblock.json", JSON.stringify(superblock), function(err){
				if(err){
					log.message(log.ERROR, "error saving superblock to disk");
				} else {
					log.message(log.INFO, "superblock saved to disk");
				}
			});
		}
	}
	
	var stats = system_stats();
	log.message(log.INFO, stats.file_count + " files stored in " + stats.block_count + " blocks, " + stats.unique_blocks + " unique (" + Math.round((stats.unique_blocks / stats.block_count) * 100) + "%)");
}

function load_superblock(){
	for(location in config.STORAGE_LOCATIONS){
		if(config.STORAGE_LOCATIONS.hasOwnProperty(location)){
			var storage_path = config.STORAGE_LOCATIONS[location].path;
			try{
				// try the first storage device first
				// todo: loop through devices until a superblock is found
				superblock = JSON.parse(fs.readFileSync(config.STORAGE_LOCATIONS[0].path + "superblock.json"));
				log.message(log.INFO, "superblock loaded from disk");
				break;
			} catch(ex) {
				log.message(log.WARN, "unable to load superblock from disk: " + ex);
			}
		}
	}

	// stat each block to establish its current location and
	// the utilization of each storage location
	for(var storage_location in storage_locations){
		storage_locations[storage_location].usage = 0;
	}
	
	for(var file in superblock){
		if(superblock.hasOwnProperty(file)){
			var selected_file = superblock[file];
			for(var block in selected_file.blocks){
				var selected_block = selected_file.blocks[block];
				for(var storage_location in storage_locations){
					var selected_location = storage_locations[storage_location];
					if(fs.existsSync(selected_location.path + selected_block.block_hash)){
						selected_block.last_seen = selected_location.path;
						selected_location.usage++;
						break;
					} else {
						// todo: this warning should only get thrown if the block is never found,
						// right now it gets thrown if the block isn't found everywhere; fix that
						log.message(log.WARN, "block " + selected_block.block_hash + " not found in " + selected_location.path);
					}
				}
			}
		}
	}
	
	// debug
	//console.log(JSON.stringify(superblock));
	//console.log(JSON.stringify(storage_locations));
	
	var stats = system_stats();
	log.message(log.INFO, stats.file_count + " files stored in " + stats.block_count + " blocks, " + stats.unique_blocks + " unique (" + Math.round((stats.unique_blocks / stats.block_count) * 100) + "%)");
	
	for(var storage_location in storage_locations){
		log.message(log.INFO, storage_locations[storage_location].usage + " of " + storage_locations[storage_location].capacity + " blocks used on " + storage_locations[storage_location].path);
	}
}

function system_stats(){

	var stats = {};
	stats.file_count = 0;
	stats.block_count = 0;
	stats.unique_blocks = 0;
	stats.unique_blocks_accumulator = [];

	for(var file in superblock){
		if(superblock.hasOwnProperty(file)){
			
			var selected_file = superblock[file];
			
			// count blocks
			stats.block_count = stats.block_count + selected_file.blocks.length;

			// accumulate unique blocks
			for(var i=0;i<selected_file.blocks.length;i++){
				
				// I think this can be done more efficiently, but this works for now
				if(stats.unique_blocks_accumulator.indexOf(selected_file.blocks[i]) == -1){
					stats.unique_blocks_accumulator.push(selected_file.blocks[i]);
				}
			}
			
			// increment file count
			stats.file_count++;
		}
	}
	
	stats.unique_blocks = stats.unique_blocks_accumulator.length;
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

// expiring url support
// temporary urls are created by concatinating the access_token
// and an expiration date (in EPOC) and then generating a sha1 hash
// to be used along with the time during the request
function time_token_valid(file, expire_time, time_token){
	// make sure requested time is still valid
	if(expire_time < (new Date()).getTime()){
		log.message(log.WARN,"expire_time is in the past");
		return false;
	} else {
		// make sure time_token is valid
		shasum = crypto.createHash("sha1");
		shasum.update(file.access_token + expire_time);
		var expected_time_token = shasum.digest("hex");
		if(time_token != expected_time_token){
			log.message(log.WARN,"time_token is invalid");
			return false;
		} else {
			return true;
		}
	}
}

// base storage object
var inode = {
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

		// add file to storage superblock
		superblock[this.url] = this.file_metadata;

		// write updated superblock to disk
		save_superblock();

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

		// if encryption is set, encrypt using the hash above
		if(this.file_metadata.encrypted && this.file_metadata.access_token){
			log.message(log.INFO, "encrypting block");
			block = encrypt(block, this.file_metadata.access_token);
		} else {
			// if even one block can't be encrypted, say so and stop trying
			this.file_metadata.encrypted = false;
		}
		
		// generate a hash of the block to use as a handle/filename
		var block_hash = null;
		shasum = crypto.createHash("sha1");
		shasum.update(block);
		block_hash = shasum.digest("hex");

		// save the block to disk
		// todo: dynamically select location for block
		var block_object = {};
		block_object.block_hash = block_hash;
		
		//var selected_storage_location = null;
		
		// sort storage locations by avaliable capacity
		storage_locations.sort(function(a,b) { return parseFloat(b.capacity - b.usage) - parseFloat(a.capacity - a.usage) });
		
		// debug
		for(var storage_location in storage_locations){
			
			log.message(log.INFO, "available capacity: " + (storage_locations[storage_location].capacity - storage_locations[storage_location].usage) + " on " + storage_locations[storage_location].path);
			
		}
		
		
		// use the location with the most avaliable storage
		var block_file = storage_locations[0].path + block_hash;
		if(!fs.existsSync(block_file)){
			log.message(log.INFO, "storing block " + block_hash);
		} else {
			log.message(log.INFO, "duplicate block " + block_hash);
		}

		fs.writeFileSync(block_file, block, "binary");
		storage_locations[0].usage++;
		
		this.file_metadata.blocks.push(block_object);
		
		//this.file_metadata.blocks.push(block_hash);
		this.input_buffer = this.input_buffer.slice(this.block_size);
	}
};


// *** CONFIGURATION ***
log.level = config.LOG_LEVEL;	// the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error


// *** INIT ***
storage_locations = config.STORAGE_LOCATIONS;
load_superblock();


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

	// get temporary url parameters out of the request if present
	var expire_time = require("url").parse(req.url,true).query.expire_time;
	var time_token = require("url").parse(req.url,true).query.time_token;
	
	// host-based url shortcut expansion
	if(target_url.substring(0,2) != "/."){
		var host_string = req.headers["host"];
		if(host_string){
			var host_string_parts = host_string.split(":");
			var forward_host = host_string_parts[0].split(".");
			var reversed_host = "";
			for(var i=(forward_host.length - 1);i>=0;i--){
				reversed_host = reversed_host + "." + forward_host[i];
			}
			target_url = "/" + reversed_host.substring(1) + target_url;
		}
	} else {
		target_url = "/" + target_url.substring(2);
	}

	var content_type = req.headers["content-type"];
	var access_token = req.headers["x-access-token"];
	var private = req.headers["x-private"];
	var encrypted = req.headers["x-encrypted"];

	log.message(log.INFO, "Received " + req.method + " requeset for URL " + target_url);

	switch(req.method){

		case "GET":

			// if url ends in "/", return a list of public files
			if(target_url.slice(-1) == "/"){

				var public_directory = [];

				for(var file in superblock){
					if(superblock.hasOwnProperty(file)){
						if(!superblock[file].private && (file.indexOf(target_url) > -1)){
							
							// remove leading path from filename
							file = file.slice(target_url.length);

							// remove trailing path from subdirectories
							if(file.indexOf("/") > -1){
								file = file.slice(0,(file.indexOf("/") + 1));
							}

							// don't add duplicate entries
							if(public_directory.indexOf(file) == -1){
								public_directory.push(file);
							}
						}
					}
				}
				
				res.write(JSON.stringify(public_directory));
				res.end();

			} else {

				// return the file located at the requested URL
				var requested_file = null;
		
				// check for existance of requested URL
				if(typeof superblock[target_url] != "undefined"){

					requested_file = superblock[target_url];

					// return status 200
					res.statusCode = 200;

					// check authorization of URL
					if(!requested_file.private ||
						(requested_file.private && requested_file.access_token === access_token) ||
						time_token_valid(requested_file, expire_time, time_token)){

						 // return file metadata as HTTP headers
						res.setHeader("Content-Type", requested_file.content_type);
		
						// return file blocks
						for(var i=0; i < requested_file.blocks.length; i++){
							var block_filename = config.STORAGE_PATH + requested_file.blocks[i];
							var block_data = fs.readFileSync(block_filename);

							if(requested_file.encrypted){
								log.message(log.INFO, "decrypting block");
								block_data = decrypt(block_data, requested_file.access_token);
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
			if(typeof superblock[target_url] === "undefined"){

				// store the posted data at the specified URL
				var file_metadata = null;
				var new_file = Object.create(inode);
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
			if(typeof superblock[target_url] != "undefined"){

				var original_file = superblock[target_url];

				// check authorization
				if(original_file.access_token === access_token){

					// update the posted data at the specified URL
					var new_file = Object.create(inode);
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
      if(typeof superblock[target_url] != "undefined"){

        var original_file = superblock[target_url];

        // check authorization
        if(original_file.access_token === access_token){

					// unlink the url
					delete superblock[target_url];

					save_superblock();
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

			if(typeof superblock[target_url] != "undefined"){
				var requested_file = superblock[target_url];
				if(!requested_file.private ||
					(requested_file.access_token === access_token) ||
					time_token_valid(requested_file, expire_time, time_token)){
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
