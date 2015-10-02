/// jsfs - Javascript filesystem with a REST interface

// *** CONVENTIONS ***
// strings are double-quoted, variables use underscores, constants are ALL CAPS

// *** UTILITIES  & MODULES ***
var http = require("http");
var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var config = require("./config.js");
var log = require("./jlog.js");
var url = require("url");

// global to keep track of storage location rotation
var next_storage_location = 0;

// save inode to disk
function save_inode(inode){

	// store a copy of each inode in each storage location for redundancy
	for(storage_location in config.STORAGE_LOCATIONS){
		var selected_location = config.STORAGE_LOCATIONS[storage_location];
		fs.writeFile(selected_location.path + inode.fingerprint + ".json", JSON.stringify(inode), function(error){
			if(error){
				log.message(log.ERROR, "Error saving inode: " + error);
			} else {
				log.message(log.INFO, "Inode saved to disk");
			}
		});
	}
}

// load inode from disk
function load_inode(url){
	var inode = null;
	log.message(log.DEBUG, "url: " + url);

	// calculate fingerprint
	shasum = crypto.createHash("sha1");
	shasum.update(url);
 	var inode_fingerprint =  shasum.digest("hex");
	try{
		inode = (JSON.parse(fs.readFileSync(config.STORAGE_LOCATIONS[0].path + inode_fingerprint + ".json")));
		
		// TODO: look for backup copies of the inode on other storage devices
	} catch(ex) {
		log.message(log.WARN, "Unable to load inode for requested URL: " + ex);
	}
	return inode;
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

function commit_block_to_disk(block, block_object){

	// if storage locations exist, save the block to disk
	if(config.STORAGE_LOCATIONS.length > 0){

		// check all storage locations to see if we already have this block
		var found_block_count = 0;
		for(storage_location in config.STORAGE_LOCATIONS){
			var selected_location = config.STORAGE_LOCATIONS[storage_location];

			// check if block exists
			try{
				var block_file_stats = fs.statSync(selected_location.path + block_object.block_hash);
				found_block_count++;
				log.message(log.INFO, "Block " + block_object.block_hash + " found in " + selected_location.path);
			} catch(ex) {
				log.message(log.WARN, "Block " + block_object.block_hash + " not found in " + selected_location.path);
			}
		}

		// TODO: consider increasing found count to enable block redundancy
		if(found_block_count < 1){

			// write new block to disk
			log.message(log.DEBUG, "next_storage_location: " + next_storage_location);
			fs.writeFileSync(config.STORAGE_LOCATIONS[next_storage_location].path + block_object.block_hash, block, "binary");
			log.message(log.INFO, "New block " + block_object.block_hash + " written to " + config.STORAGE_LOCATIONS[next_storage_location].path);

			// increment (or reset) storage location (striping)
			next_storage_location++;
			if(next_storage_location === config.STORAGE_LOCATIONS.length){
				next_storage_location = 0;
			}
		} else {
			log.message(log.INFO, "Duplicate block " + block_object.block_hash + " not written to disk");
		}
	} else {
		log.message(log.WARN, "No storage locations configured, block not written to disk");
	}
	return block_object;
}

function token_valid(access_token, inode, method){

	// don't bother validating tokens for HEAD, OPTIONS requests
	// jjg - 08172015: might make sense to address this by removing the check from
	// the method handlers below, but since I'm not sure if this is
	// permanent, this is cleaner for now
	if(method === "HEAD" || method === "OPTIONS"){
		return true;
	}

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

	// don't bother validating tokens for HEAD, OPTIONS requests
	if(method === "HEAD" || method === "OPTIONS"){
		return true;
	}

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
var Inode = {
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
		this.file_metadata.blocks_replicated = 0;
		this.file_metadata.inode_replicated = 0;
		this.file_metadata.blocks = [];

		// create fingerprint to uniquely identify this file
		shasum = crypto.createHash("sha1");
		shasum.update(this.file_metadata.url);
		this.file_metadata.fingerprint =  shasum.digest("hex");

		// use fingerprint as default key
		this.file_metadata.access_key = this.file_metadata.fingerprint;
	},
	write: function(chunk){
		this.input_buffer = new Buffer.concat([this.input_buffer, chunk]);
		return this.process_buffer();
	},
	close: function(callback){
		var result  = this.process_buffer(true);
		if(result){

			// if result wasn't null, return the inode details
			result = this.file_metadata;

			// write inode to disk
			save_inode(this.file_metadata);

			// if peers are configured, update their superblocks
			if(peers.length > 0){
				var peers_remaining = peers.length;
				// loop through each peer
				for(peer in peers){
					var selected_peer = peers[peer];
					log.message(log.INFO, "Transmitting inode to peer " + selected_peer.host);
					var inode_payload = JSON.stringify(this.file_metadata);
					// POST inode to peer
					var options = {
						hostname: selected_peer.host,
						port: selected_peer.port,
						path: this.file_metadata.url,
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Content-Length": inode_payload.length,
							"x-inode-only": "true"
						}
					};
					var P_this = this;  // closure-like access to local properties during http callback
					var req = https.request(options, function(res){
						log.message(log.DEBUG, "inode POST status: " + res.statusCode);
						res.setEncoding('utf8');
						res.on("data", function(chunk){
							//log.message(log.DEBUG, "inode POST body: " + chunk);
						});
						res.on("end", function(){
							log.message(log.INFO, "Remote inode stored");
							peers_remaining = peers_remaining - 1;
							// block until all peers have received the inode
							if(peers_remaining === 0){
								// update inode_replicated count
								P_this.file_metadata.inode_replicated++;
								// fire finalization test
								P_this.finalize_peers(function(result){
									if(result){
										callback(result);
									}
								});
							}
						});
					});
					req.on("error", function(e){
						log.message(log.ERROR, "Error transmitting inode to peer " + selected_peer.host + ": " + e.message);
						peers_remaining = peers_remaining - 1;
						P_this.finalize_peers(function(result){
							if(result){
								callback(result)
							}
						});
					});
					req.write(inode_payload);
					req.end();
				}
			} else {
				// no peers so return immediately
				callback(result);
			}
		}
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
		if(result){

			// do nothing
		} else {
			log.message(log.DEBUG, "process_buffer result: " + result);
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
		block_object = commit_block_to_disk(block, block_object);

		// update inode
		this.file_metadata.blocks.push(block_object);

		// advance buffer
		this.input_buffer = this.input_buffer.slice(this.block_size);

		// if peers exist, distribute block
		if(peers.length > 0){

			// loop through each peer
			for(peer in peers){
				var selected_peer = peers[peer];
				log.message(log.INFO, "Transmitting block to peer " + selected_peer.host);

				// POST block to peer
				var options = {
					hostname: selected_peer.host,
					port: selected_peer.port,
					path: "/_bs/" + block_hash,
					method: "POST",
					headers: {
						//"Content-Type": "application/octet-stream",
						"Content-Length": block.length,
						"x-block-only": block_hash
					}
				};

				var P_this = this;	// closure-like access to local properties during http callback
				var P_result = result;
				log.message(log.DEBUG, "P_result: " + P_result);
				var req = https.request(options, function(res){

					log.message(log.DEBUG, "Block POST status: " + res.statusCode);
					if(res.statusCode === 405){
						log.message(log.INFO, "Duplicate block " + block_hash + " not transmitted");
					}

					//res.setEncoding('utf8');

					res.on("data", function(chunk){
						//log.message(log.DEBUG, "Block POST body: " + chunk);
					});

					res.on("end", function(){
						// increment blocks_replicated property
						P_this.file_metadata.blocks_replicated++;
						// fire finalization test
						P_this.finalize_peers(function(result){
							// todo: stop blocking if the last block was transferred
							// (do nothing for now)
						});
					});
				});

				req.on("error", function(e){
					// errors happend deliberately when a block exists at the peer,
					// so we don't log them now. A better solutionw would to be to
					// log non-405 errors but I don't know how to determine that ATM
					//log.message(log.ERROR, "Error POSTing block: " + block_hash + ", " + e.message);
				});

				req.write(block);
				req.end();
			}
		}
		return result;
	},
	finalize_peers: function(callback){
		var result = false;
		log.message(log.INFO, "Testing for peer finalization");
		log.message(log.DEBUG, "blocks: " + this.file_metadata.blocks.length + ", replicated: " + this.file_metadata.blocks_replicated);
		log.message(log.DEBUG, "inode replicated: " + this.file_metadata.inode_replicated);
/*
		if(this.file_metadata.blocks_replicated === this.file_metadata.blocks.length
			&& this.file_metadata.inode_replicated > 0){
*/
		if(this.file_metadata.inode_replicated > 0){
			log.message(log.INFO, "Peer finalization verified");
			result = this.file_metadata;
			callback(result);
		} else {
			log.message(log.INFO, "Peer finalization incomplete");
			callback(result);
		}
	}
};

// *** CONFIGURATION ***
log.level = config.LOG_LEVEL;	// the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error

log.message(log.INFO, "JSFS ready to process requests");

// *** INIT ***
var peers = config.PEERS;

// at the highest level, jsfs is an HTTP server that accepts GET, POST, PUT, DELETE and OPTIONS methods
http.createServer(function(req, res){

	// override default 2 minute time-out
	res.setTimeout(config.REQUEST_TIMEOUT * 60 * 1000);

	log.message(log.DEBUG, "Initial request received");

	// all responses include these headers to support cross-domain requests
	var allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
	var allowed_headers = ["Accept", "Accept-Version", "Content-Type", "Api-Version", "Origin", "X-Requested-With","Range","X_FILENAME","X-Access-Key","X-Replacement-Access-Key","X-Access-Token", "X-Encrypted", "X-Private", "X-Append"];
	var exposed_headers = ["X-Media-Type", "X-Media-Size", "X-Media-Channels", "X-Media-Bitrate", "X-Media-Resolution", "X-Media-Duration"];

	res.setHeader("Access-Control-Allow-Methods", allowed_methods.join(","));
	res.setHeader("Access-Control-Allow-Headers", allowed_headers.join(","));
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Expose-Headers", exposed_headers.join(","));

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
	var inode_only = url.parse(req.url,true).query.inode_only || req.headers["x-inode-only"];
	var block_only = url.parse(req.url,true).query.block_only || req.headers["x-block-only"];

	log.message(log.INFO, "Received " + req.method + " request for URL " + target_url);

	switch(req.method){

		case "GET":

			// load requested inode
			var inode = load_inode(target_url);

			// return the first file located at the requested URL
			if(inode){
				requested_file = inode;

				// return status
				res.statusCode = 200;

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
						for(var storage_location in config.STORAGE_LOCATIONS){
							var selected_location = config.STORAGE_LOCATIONS[storage_location];
							if(fs.existsSync(selected_location.path + requested_file.blocks[i].block_hash)){
								log.message(log.INFO, "found block " + requested_file.blocks[i].block_hash + " in " + selected_location.path);
								requested_file.blocks[i].last_seen = selected_location.path;

								// TODO: update inode on disk to include discovered block location
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
				log.message(log.WARN, "Result: 404");
				res.statusCode = 404;
				res.end();
			}

		break;

	case "POST":
	case "PUT":

		// if block_only, test below to see if we already have the block
		if(block_only && unique_blocks.indexOf(block_only) > -1){
            log.message(log.INFO, "Block-only update complete: block exists");
            res.statusCode = 200;
            res.end();
		} else {
			if(!block_only && !inode_only){				// handle as regular file

				// check if a file exists at this url 
				log.message(log.DEBUG, "Begin checking for existing file");
				var inode = load_inode(target_url);
				if(inode){

					// check authorization
          if((access_key && access_key === inode.access_key) ||
            (access_token && token_valid(access_token, inode, req.method)) ||
            (access_token && expires && time_token_valid(access_token, inode, expires, req.method))){
						log.message(log.INFO, "File update request authorized");
					} else {
						log.message(log.WARN, "File update request unauthorized");
						res.statusCode = 401;
						res.end();
						break;
					}
				} else {
					log.message(log.DEBUG, "No existing file found, storing new file");
				}

				// store the posted data at the specified URL
				var new_file = Object.create(Inode);
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

				// if access_key is supplied with update, replace the default one
				if(access_key){
					new_file.file_metadata.access_key = access_key;
				}
				log.message(log.INFO, "File properties set");
			} else {
	      var file_metadata = "";
  	    var block_buffer = new Buffer("");
			}

			req.on("data", function(chunk){
				if(inode_only){
					log.message(log.DEBUG, "Received new inode chunk");
					file_metadata+=chunk;
					log.message(log.DEBUG, file_metadata);
				} else if (block_only){

					// append chunk to block
					block_buffer = new Buffer.concat([block_buffer, chunk]);
				} else {
					if(!new_file.write(chunk)){
						log.message(log.ERROR, "Error writing data to storage object");
						res.statusCode = 500;
						res.end();
					}
				}
			});

			req.on("end", function(){
				if(block_only){
					log.message(log.INFO, "End of block-only request");

					// generate a hash of the block to use as a handle/filename
					var block_hash = null;
					shasum = crypto.createHash("sha1");
					shasum.update(block_buffer);

					// create stub block object for storage processing
					var block_object = {};
					block_object.block_hash = shasum.digest("hex");

					// TODO: consider doing a checksum verification here
					// write block to disk
					block_object = commit_block_to_disk(block_buffer, block_object);
					res.end();
				} else if(inode_only){
					log.message(log.INFO, "End of inode-only request");

					// manually add the new inode to the superblock
					log.message(log.INFO, "Manually adding new inode to superblock");
					var inode_metadata = JSON.parse(file_metadata);

					// store inode
					save_inode(inode_metadata);
					res.end(file_metadata);
				} else {
					log.message(log.INFO, "End of request");
					if(new_file){
						log.message(log.DEBUG, "Closing new file");
						new_file.close(function(result){
							if(result){
								res.end(JSON.stringify(result));
							} else {
								log.message(log.ERROR, "Error closing storage object");
								res.statusCode = 500;
								res.end();
							}
						});
					}
				}
			});
		}

		break;

	case "DELETE":

		// remove the data stored at the specified URL
		var inode = load_inode(target_url);
		if(inode){

			// authorize (only keyholder can delete)
			if(inode.access_key === access_key){

				// delete inode file
				log.message(log.INFO, "Delete request authorized");

				// TODO: use actual storage location (not hard-coded one as below)
				fs.unlinkSync(storage_locations[0].path + inode.fingerprint + ".json");
				res.statusCode = 204;
				res.end();
			} else {
				log.message(log.WARN, "Delete request unauthorized");
				res.statusCode = 401;
				res.end();
			}
		} else {
			log.message(log.WARN, "Delete request file not found");
			res.statusCode = 404;
			res.end();
		}

		break;

	case "HEAD":
		var requested_file = load_inode(target_url);
		if(requested_file){

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
			res.end();
		} else {
			log.message(log.INFO, "Result: 404");
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

}).listen(config.SERVER_PORT);
