// jsfs - Javascript filesystem with a REST interface

// *** CONVENTIONS ***
// strings are double-quoted, variables use underscores, constants are ALL CAPS

// *** GLOBALS ***
// the plan is to eliminate these eventually...
var superblock = {};
var storage_locations = {};
var unique_blocks = [];	// todo: find a less brute-force, more efficient way to track this

// *** UTILITIES  & MODULES ***
var http = require("http");
var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var config = require("./config.js");
var log = require("./jlog.js");
var url = require("url");

function save_superblock(){
	for(var location in config.STORAGE_LOCATIONS){
		if(config.STORAGE_LOCATIONS.hasOwnProperty(location)){
			var storage_path = config.STORAGE_LOCATIONS[location].path;

			fs.writeFile(storage_path + "superblock.json", JSON.stringify(superblock), function(err){
				if(err){
					log.message(log.ERROR, "error saving superblock to disk");
				} else {
					log.message(log.INFO, "superblock saved to " + storage_path);
				}
			});
		}
	}
}

function load_superblock(){
	for(var location in config.STORAGE_LOCATIONS){
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

	// establish the utilization of each storage location
	for(var storage_location in storage_locations){
		storage_locations[storage_location].usage = 0;
	}

	// use global unique_blocks for now
	for(var file in superblock){
		if(superblock.hasOwnProperty(file)){
			var selected_file = superblock[file];
			for(var block in selected_file.blocks){
				var selected_block = selected_file.blocks[block];
				for(var storage_location in storage_locations){
					var selected_location = storage_locations[storage_location];
					if(fs.existsSync(selected_location.path + selected_block.block_hash)){
						selected_block.last_seen = selected_location.path;

						// only count unique blocks per device
						if(unique_blocks.indexOf(selected_block.block_hash) == -1){
							unique_blocks.push(selected_block.block_hash);

							// estimate device utilization by mutiplying block size by block count
							selected_location.usage = selected_location.usage + config.BLOCK_SIZE;
						}

						break;
					} else {
						// todo: this warning should only get thrown if the block is never found,
						// right now it gets thrown if the block isn't found everywhere; fix that
						//log.message(log.WARN, "block " + selected_block.block_hash + " not found in " + selected_location.path);
					}
				}

			}
		}
	}

	var stats = system_stats();
	log.message(log.INFO, stats.file_count + " files stored in " + stats.block_count + " blocks, " + stats.unique_blocks + " unique (" + Math.round((stats.unique_blocks / stats.block_count) * 100) + "%)");

	for(var storage_location in storage_locations){
		log.message(log.INFO, storage_locations[storage_location].usage + " of " + storage_locations[storage_location].capacity + " bytes used on " + storage_locations[storage_location].path);
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
				if(stats.unique_blocks_accumulator.indexOf(selected_file.blocks[i].block_hash) == -1){
					stats.unique_blocks_accumulator.push(selected_file.blocks[i].block_hash);
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

// examine the contents of a block to generate metadata
function analyze_block(block){

	var result = {};
	result.type = "unknown";

	try{
	// test for WAVE
	if(block.toString("utf8", 0, 4) === "RIFF"
		& block.toString("utf8", 8, 12) === "WAVE"
		& block.readUInt16LE(20) == 1){

		result.type = "wave";
	    result.size = block.readUInt32LE(4);
	    result.channels = block.readUInt16LE(22);
	    result.bitrate = block.readUInt32LE(24);
	    result.resolution = block.readUInt16LE(34);
		result.duration = ((((result.size * 8) / result.channels) / result.resolution) / result.bitrate);
	}

	// todo: test for MP3
	// todo: test for FLAC
	// todo: test for AIFF
	// todo: test for ...
	} catch(ex) {
		log.message(log.WARN, "Exception analyzing media type: " + ex);
	}

	return result;
}

function token_valid(access_token, inode, method){

	// generate expected token
	var shasum = crypto.createHash("sha1");
	shasum.update(inode.access_key + method);
	var expected_token = shasum.digest("hex");

	log.message(log.DEBUG,"expected_token: " + expected_token);
	log.message(log.DEBUG,"access_token: " + access_token);

	// compare
	if(expected_token === access_token){
		return true;
	} else {
		return false;
	}
}

function time_token_valid(access_token, inode, expires, method){

	// make sure requested time is still valid
	if(expires < (new Date()).getTime()){
		log.message(log.WARN,"expires is in the past");
		return false;
	} else {
		// make sure token is valid
		// generate expected token
		var shasum = crypto.createHash("sha1");
		shasum.update(inode.access_key + method + expires);
		var expected_token = shasum.digest("hex");

		log.message(log.DEBUG,"expected_token: " + expected_token);
		log.message(log.DEBUG,"access_token: " + access_token);

		// compare
		if(expected_token === access_token){
			return true;
		} else {
			return false;
		}
	}
}

// base storage object
var inode = {
	init: function(url){
		this.input_buffer = new Buffer("");
		this.block_size = config.BLOCK_SIZE;
		this.file_metadata = {};
		this.file_metadata.url = url;
		this.file_metadata.created = (new Date()).getTime();
		this.file_metadata.version = 0;
		this.file_metadata.private = false;
		this.file_metadata.encrypted = false;
		this.file_metadata.fingerprint = null;
		this.file_metadata.access_key = null;
		this.file_metadata.content_type = "application/octet-stream";
		this.file_metadata.file_size = 0;
		this.file_metadata.block_size = this.block_size;
		this.file_metadata.blocks = [];

		// if previous version exists, increment version number before fingerprinting
		var url_versions = [];
		for(var an_inode in superblock){
			if(superblock.hasOwnProperty(an_inode)){
				var selected_inode = superblock[an_inode];
				if(selected_inode.url === this.file_metadata.url){
					url_versions.push(selected_inode.version);
				}
			}
		}

		if(url_versions.length > 0){
			// sort versions
			url_versions.sort(function(a,b) { return parseFloat(b) - parseFloat(a) });
			// increment version by one
			this.file_metadata.version = url_versions[0] + 1;
		}

		// create fingerprint to uniquely identify this file
		shasum = crypto.createHash("sha1");
		shasum.update(JSON.stringify(this.file_metadata.url + this.file_metadata.version));
		this.file_metadata.fingerprint =  shasum.digest("hex");

		// use fingerprint as default key
		this.file_metadata.access_key = this.file_metadata.fingerprint;
	},
	write: function(chunk){
		//log.message(log.DEBUG,"got inode.write: " + chunk);
		this.input_buffer = new Buffer.concat([this.input_buffer, chunk]);
		return this.process_buffer();
	},
	close: function(){

		var result;
		result = this.process_buffer(true);
		if(result){

			// add file to storage superblock
			superblock[this.file_metadata.fingerprint] = this.file_metadata;

			// write updated superblock to disk
			save_superblock();

			// todo: if peers are configured, update their superblocks 
			// todo: loop through each peer
			// todo: POST inode to peer (X-Metadata-Only header)

			// return metadata for future operations
			result = this.file_metadata;
		}

		return result;
	},
	process_buffer: function(flush){

		var result = true;

		if(flush){

			log.message(0, "flushing remaining buffer");

			// update original file size
			this.file_metadata.file_size = this.file_metadata.file_size + this.input_buffer.length;

			// empty the remainder of the buffer
			while(this.input_buffer.length > 0){
				result = this.store_block();
			}

		} else {

			while(this.input_buffer.length > this.block_size){

				// update original file size
				this.file_metadata.file_size = this.file_metadata.file_size + this.block_size;

				result = this.store_block();
			}
		}

		return result;
	},
	store_block: function(){

		var result = true;

		// grab the next block
		var block = this.input_buffer.slice(0, this.block_size);

		if(this.file_metadata.blocks.length === 0){
			// grok known file types
			var analysis_result = analyze_block(block);
			log.message(log.INFO, "block analysis result: " + JSON.stringify(analysis_result));
			
			// if we found out anything useful, annotate the object's metadata
			this.file_metadata.media_type = analysis_result.type;
			if(analysis_result.type != "unknown"){
				this.file_metadata.media_size = analysis_result.size;
				this.file_metadata.media_channels = analysis_result.channels;
				this.file_metadata.media_bitrate = analysis_result.bitrate;
				this.file_metadata.media_resolution = analysis_result.resolution;
				this.file_metadata.media_duration = analysis_result.duration;
			}
		}

		// if encryption is set, encrypt using the hash above
		if(this.file_metadata.encrypted && this.file_metadata.access_key){
			log.message(log.INFO, "encrypting block");
			block = encrypt(block, this.file_metadata.access_key);
		} else {
			// if even one block can't be encrypted, say so and stop trying
			this.file_metadata.encrypted = false;
		}

		// generate a hash of the block to use as a handle/filename
		var block_hash = null;
		shasum = crypto.createHash("sha1");
		shasum.update(block);
		block_hash = shasum.digest("hex");

		// store the block 
		var block_object = {};
		block_object.block_hash = block_hash;

		// if storage locations exist, save the block to disk
		if(storage_locations.length > 0){
			if(unique_blocks.indexOf(block_hash) == -1){

				unique_blocks.push(block_hash);

				// sort storage locations by avaliable capacity
				storage_locations.sort(function(a,b) { return parseFloat(b.capacity - b.usage) - parseFloat(a.capacity - a.usage) });

				// select location with highest avaliable capacity
				block_object.last_seen = storage_locations[0].path;
				var block_file = storage_locations[0].path + block_hash;

				// make sure there's enough capacity left to store the block
				if((storage_locations[0].capacity - storage_locations[0].usage) > block.length){

					log.message(log.INFO, "storing block:   " + block_hash);
					fs.writeFileSync(block_file, block, "binary");
					storage_locations[0].usage = storage_locations[0].usage + block.length;

				} else {
					log.message(log.ERROR, "no room left to store block " + block_hash);
					result = false;
				}

			} else {

				// todo: set the last_seen property of the block_object to the location of the original block!!!
				// this is harder than it might seem, we could be lazy and rely on the GET "go hunting"
				// mechanism, but that seems hackish...
				log.message(log.INFO, "duplicate block: " + block_hash);
			}
		} else {
			log.message(log.INFO, "No storage locations configured, block not written to disk");
		}

		// if peers exist, distribute block
		if(peers.length > 0){
			// loop through each peer
			for(peer in peers){
				var selected_peer = peers[peer];
				log.message(log.INFO, "Transmitting block to peer " + selected_peer);

				// todo: POST block to peer
				var options = {
					hostname: selected_peer,
					path: "/_bs/" + block_hash,
					method: "POST",
					headers: {
						"Content-Type": "application/octet-stream",
						"Content-Length": block.length
					}
				};

				var req = https.request(options, function(res){
					log.message(log.DEBUG, "Block POST status: " + res.statusCode);
					res.setEncoding('utf8');
					res.on("data", function(chunk){
						log.message(log.DEBUG, "Block POST body: " + chunk);
					});
				});

				req.on("error", function(e){
					log.message(log.ERROR, "Error POSTing block: " + block_hash + ", " + e.message);
				});

				req.write(block);
				req.end();
			}
		}

		// update inode
		this.file_metadata.blocks.push(block_object);

		// advance buffer
		this.input_buffer = this.input_buffer.slice(this.block_size);

		return result;
	}
};

// *** CONFIGURATION ***
log.level = config.LOG_LEVEL;	// the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error


// *** INIT ***
storage_locations = config.STORAGE_LOCATIONS;
var peers = config.PEERS;
load_superblock();


// at the highest level, jsfs is an HTTP server that accepts GET, POST, PUT, DELETE and OPTIONS methods
http.createServer(function(req, res){

	log.message(log.DEBUG, "Initial request received");

	// all responses include these headers to support cross-domain requests
	var allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
	var allowed_headers = ["Accept", "Accept-Version", "Content-Type", "Api-Version", "Origin", "X-Requested-With","Range","X_FILENAME","X-Access-Key","X-Replacement-Access-Key","X-Access-Token", "X-Encrypted", "X-Private", "X-Append"];

	res.setHeader("Access-Control-Allow-Methods", allowed_methods.join(","));
	res.setHeader("Access-Control-Allow-Headers", allowed_headers.join(","));
	res.setHeader("Access-Control-Allow-Origin", "*");

	// all requests are interrorgated for these values
	var target_url = require("url").parse(req.url).pathname;

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

	// check for request parameters, first in the header and then in the querystring
	var access_token = url.parse(req.url,true).query.access_token || req.headers["x-access-token"];
	var access_key = url.parse(req.url,true).query.access_key || req.headers["x-access-key"];
	var replacement_access_key = url.parse(req.url,true).query.replacement_access_key || req.headers["x-replacement-access-key"];
	var private = url.parse(req.url,true).query.private || req.headers["x-private"];
	var encrypted = url.parse(req.url,true).query.encrypted || req.headers["x-encrypted"];
	var expires = url.parse(req.url,true).query.expires || req.headers["x-expires"];
	var content_type = url.parse(req.url,true).query.content_type || req.headers["content-type"];
	var version = url.parse(req.url,true).query.version || req.headers["x-version"];

	log.message(log.INFO, "Received " + req.method + " request for URL " + target_url);

	switch(req.method){

		case "GET":

			var request_status = 404;

			// if url ends in "/", return a list of public files
			var return_index = false;
			if(target_url.slice(-1) == "/"){
				target_url = target_url.slice(0,target_url.length - 1);
				return_index = true;
			}

			var matching_inodes = [];
			for(var an_inode in superblock){
				if(superblock.hasOwnProperty(an_inode)){
					var selected_inode = superblock[an_inode];
					if(selected_inode.url.indexOf(target_url) > -1){	// todo: consider making this match more precise
						if(!selected_inode.private ||
							(access_key && access_key === selected_inode.access_key) ||
							(access_token && token_valid(access_token, selected_inode, req.method)) ||
							(access_token && expires && time_token_valid(access_token, selected_inode, expires, req.method))){

							// if a specific version is requested, return only that version
							if(version){
								if(selected_inode.version == version){
									request_status = 200;
									matching_inodes.push(selected_inode);
									break;
								}
							}

							// we found at least one file you have access to
							request_status = 200;
							matching_inodes.push(selected_inode);

						} else {
							// we found a file, but you don't have permission to see it
							request_status = 401;
						}
					}
				}
			}

			// sort by version
			matching_inodes.sort(function(a,b) { return parseFloat(b.version) - parseFloat(a.version) });

			// this feels like awkward logic but good enough for now
			if(return_index){

				// don't return internal-use-only metadata
				var index_inodes = [];
				for(var an_inode in matching_inodes){
					if(matching_inodes.hasOwnProperty(an_inode)){
						var selected_inode = matching_inodes[an_inode];
						var index_inode = {};
						index_inode.url = selected_inode.url;
						index_inode.created = selected_inode.created;
						index_inode.version = selected_inode.version;
						index_inode.content_type = selected_inode.content_type;
						index_inode.file_size = selected_inode.file_size;

						index_inodes.push(index_inode);
					}
				}
				res.write(JSON.stringify(index_inodes));
				res.end();
			} else {

				// return the first file located at the requested URL
				if(matching_inodes.length > 0){

					requested_file = matching_inodes[0];

					// return status
					res.statusCode = request_status;

					// return file metadata as HTTP headers
					res.setHeader("Content-Type", requested_file.content_type);
					res.setHeader("Content-Length", requested_file.file_size);

					// return file blocks
					for(var i=0; i < requested_file.blocks.length; i++){

						var block_data = null;
						if(requested_file.blocks[i].last_seen){
							var block_filename = requested_file.blocks[i].last_seen + requested_file.blocks[i].block_hash;

							try{
								block_data = fs.readFileSync(block_filename);
							} catch(ex){
								log.message(log.ERROR, "cannot locate block " + requested_file.blocks[i].block_hash + " in last_seen location, hunting...");
							}

						} else {
							log.message(log.WARN, "no last_seen value for block " + requested_file.blocks[i].block_hash + ", hunting...");
						}

						// if we don't find the block where we expect it, search all storage locations
						if(!block_data){
							for(var storage_location in storage_locations){
								var selected_location = storage_locations[storage_location];
								if(fs.existsSync(selected_location.path + requested_file.blocks[i].block_hash)){
									log.message(log.INFO, "found block " + requested_file.blocks[i].block_hash + " in " + selected_location.path);
									requested_file.blocks[i].last_seen = selected_location.path;
									block_data = fs.readFileSync(selected_location.path + requested_file.blocks[i].block_hash);
								} else {
									log.message(log.ERROR, "unable to locate block " + requested_file.blocks[i].block_hash + " in " + selected_location.path);
								}
							}
						}

						if(requested_file.encrypted){
							log.message(log.INFO, "decrypting block");
							block_data = decrypt(block_data, requested_file.access_key);
						}
						// send block to caller
						if(block_data){
							res.write(block_data);
						} else {
							log.message(log.ERROR, "unable to locate missing block in any storage location");
							res.statusCode = 500;
							res.end("unable to return file, missing blocks");
							break;
						}
					}
					// finish request
					res.end();

				} else {
					// return status
					log.message(log.INFO, "Result: " + request_status);
					res.statusCode = request_status;
					res.end();
				}
			}

		break;

	case "POST":

		// make sure the URL isn't already taken
		log.message(log.DEBUG, "Begin checking for existing file");
		var matching_inodes = [];
		for(var an_inode in superblock){
			if(superblock.hasOwnProperty(an_inode)){
				var selected_inode = superblock[an_inode];
				if(selected_inode.url === target_url){
					matching_inodes.push(selected_inode);
				}
			}
		}

		if(matching_inodes.length < 1){

			log.message(log.DEBUG, "No existing file found, storing new file");

			// store the posted data at the specified URL
			var file_metadata = null;
			var new_file = Object.create(inode);
			new_file.init(target_url);

			log.message(log.DEBUG, "New file object created");

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

			// if access_key is supplied with POST, replace the default one
			if(access_key){
				new_file.file_metadata.access_key = access_key;
			}

			log.message(log.DEBUG, "File properties set");

			req.on("data", function(chunk){

				log.message(log.DEBUG, "chunk size: " + chunk.length);
				if(!new_file.write(chunk)){
					res.statusCode = 500;
					res.end("error writing blocks");
				}
			});

			req.on("end", function(){
				log.message(log.DEBUG, "Closing new file");
				var new_file_metadata = new_file.close();
				log.message(log.DEBUG, "File closed");

				if(new_file_metadata){
					res.end(JSON.stringify(new_file_metadata));
				} else {
					res.statusCode = 500;
					res.end("error writing blocks");
				}
			});

		} else {

			// if file exists at this URL, return 405 "Method not allowed"
			log.message(log.WARN,"File exists at " + target_url + ", re-POST not allowed");
			res.statusCode = 405;
			res.end();
		}

		break;

	case "PUT":

		// make sure there's a file to update
		var matching_inodes = [];
		for(var an_inode in superblock){
			if(superblock.hasOwnProperty(an_inode)){
				var selected_inode = superblock[an_inode];
				if(selected_inode.url.indexOf(target_url) > -1){    // todo: consider making this match more precise
					if((access_key && access_key === selected_inode.access_key) ||
						(access_token && token_valid(access_token, selected_inode, req.method)) ||
						(access_token && expires && time_token_valid(access_token, selected_inode, expires, req.method))){
						matching_inodes.push(selected_inode);
					}
				 }
			}
		}

		// sort by version
		matching_inodes.sort(function(a,b) { return parseFloat(b.version) - parseFloat(a.version) });

		if(matching_inodes.length > 0){

			var original_file = matching_inodes[0];

			// update the posted data at the specified URL
			var new_file = Object.create(inode);
			new_file.init(target_url);

			// copy original file properties
			new_file.file_metadata.created = original_file.created;
			new_file.file_metadata.updated = (new Date()).getTime();
			//new_file.file_metadata.fingerprint = original_file.fingerprint;
			new_file.file_metadata.content_type = original_file.content_type;
			new_file.file_metadata.private = original_file.private;
			new_file.file_metadata.encrypted = original_file.encrypted;
			if(replacement_access_key){
				new_file.file_metadata.access_key = replacement_access_key;
			} else {
				new_file.file_metadata.access_key = original_file.access_key;
			}

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
				if(!new_file.write(chunk)){
					res.statusCode = 500;
					res.end("error writing blocks");
				};
			});

			req.on("end", function(){
				var new_file_metadata = new_file.close();

				if(new_file_metadata){
					res.writeHead(204,
						{"x-version": new_file_metadata.version}
					);
					res.end();
				} else {
					res.statusCode = 500;
					res.end("error writing blocks");
				}
			});

		} else {

			// if file dosen't exist at this URL, return 405 "Method not allowed"
			res.statusCode = 405;
			res.end();
		}

		break;

	case "DELETE":

		// remove the data stored at the specified URL

		// make sure there's a file to update
		var matching_inodes = [];
		var goodResp, badResp;
		for(var an_inode in superblock){
			if(superblock.hasOwnProperty(an_inode)){
				var selected_inode = superblock[an_inode];
				if(selected_inode.url === target_url){
					if(access_key && selected_inode.access_key === access_key){
						// hard delete
						delete superblock[selected_inode.fingerprint];
					} else if((access_token && token_valid(access_token, selected_inode, req.method)) ||
								(access_token && expires && time_token_valid(access_token, selected_inode, expires, req.method))){
						// soft delete
						selected_inode.private = true;
					}
					save_superblock();
					goodResp = 204;
				} else {
					badResp = 404;
				}
			}
		}

		res.statusCode = goodResp ? goodResp : badResp;
		res.end();
		break;

	case "HEAD":
		var request_status = 404;
		var matching_inodes = [];
		for(var an_inode in superblock){
			if(superblock.hasOwnProperty(an_inode)){
				var selected_inode = superblock[an_inode];
				if(selected_inode.url.indexOf(target_url) > -1){    // todo: consider making this match more precise
					if(!selected_inode.private ||
						(access_key && access_key === selected_inode.access_key) ||
						(access_token && token_valid(access_token, selected_inode, req.method)) ||
						(access_token && expires && time_token_valid(access_token, selected_inode, expires, req.method))){

						// if a specific version is requested, return only that version
						if(version){
							if(selected_inode.version == version){
								request_status = 200;
								matching_inodes.push(selected_inode);
								break;
							}
						}

						// we found at least one file you have access to
						request_status = 200;
						matching_inodes.push(selected_inode);

					} else {
						// we found a file, but you don't have permission to see it
						request_status = 401;
					}
				}
			}
		}

		if(matching_inodes.length > 0) {

			// sort by version
			matching_inodes.sort(function(a,b) { return parseFloat(b.version) - parseFloat(a.version) });

			// select most recent version
			var requested_file = null;
			if(matching_inodes.length > 0){
				requested_file = matching_inodes[0];
			}

			// construct headers
			res.setHeader("Content-Type", requested_file.content_type);
			res.setHeader("Content-Length", requested_file.file_size);

			// add extended object headers if we have them
			if(requested_file.media_type){
				 res.setHeader("X-Media-Type", requested_file.media_type);
				if(requested_file.media_type != "unknown"){
					res.setHeader("X-Media-Size", requested_file.media_size);
					res.setHeader("X-Media-Channels", requested_file.media_channels);
					res.setHeader("X-Media-Bitrate", requested_file.media_bitrate);
					res.setHeader("X-Media-Resolution", requested_file.media_resolution);
					res.setHeader("X-Media-Duration", requested_file.media_duration);
				}
			}

			//res.writeHead(200);
/*
			res.writeHead(200,{
				"Content-Type": requested_file.content_type,
				"Content-Length": requested_file.file_size
			});
*/
			res.end();
		} else {
			// return status
			log.message(log.INFO, "Result: " + request_status);
			res.statusCode = request_status;
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
log.message(log.INFO, "Request completed with status code: " + res.statusCode);

}).listen(config.SERVER_PORT);
