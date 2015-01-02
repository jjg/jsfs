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

// base storage object
var file_store = {
	init: function(url){
		this.url = url;
		this.input_buffer = new Buffer("");
		this.block_size = BLOCK_SIZE;
		this.file_metadata = {};
		this.file_metadata.created = (new Date()).getTime();
		this.file_metadata.version = 0;	// todo: use a function to check for previous versions
		this.file_metadata.encrypted = false;
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

		// add file to storage metadata
		stored_files[this.url] = this.file_metadata;

		// todo: signal write of storage metadata to disk

		// return token for PUT, DELETE operations
		shasum = crypto.createHash("sha1");
		shasum.update(JSON.stringify(this.file_metadata));
		return shasum.digest("hex");

	},
	process_buffer: function(flush){
		if(this.input_buffer.length > this.block_size || flush){

			if(flush){
				log.message(log.INFO, "flushing remaining buffer");
			}

			var block = this.input_buffer.slice(0, this.block_size);

			var block_hash = null;
			shasum = crypto.createHash("sha1");
			shasum.update(block);
			block_hash = shasum.digest("hex");

			var block_file = STORAGE_PATH + block_hash;
			if(!fs.existsSync(block_file)){
				log.message(log.INFO, "storing block " + block_file);
				fs.writeFileSync(block_file, block, "binary");
			} else {
				log.message(log.INFO, "duplicate block " + block_hash + " not stored");
			}

			this.file_metadata.blocks.push(block_hash);
			this.input_buffer = this.input_buffer.slice(this.block_size);

		} else {
			log.message(log.INFO, "received chunk");
		}
	}
};

// *** CONFIGURATION ***
// configuration values will be stored in an external module once we know what they all are
var SERVER_PORT = 7302;		// the port the HTTP server listens on
var STORAGE_PATH = "./blocks/";
var BLOCK_SIZE = 1024;
log.level = 0;				// the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error

// at the highest level, jsfs is an HTTP server that accepts GET, POST, PUT, DELETE and OPTIONS methods
http.createServer(function(req, res){

	var target_url = require("url").parse(req.url).pathname;
  log.message(log.INFO, "Received " + req.method + " requeset for URL " + target_url);

	switch(req.method){

		case "GET":

			// todo:  return the file located at the requested URL 

			res.end();

			break;

		case "POST":

			// store the posted data at the specified URL
			var file_token = null; 
      var new_file = Object.create(file_store);
      new_file.init(target_url);

      req.on("data", function(chunk){
        new_file.write(chunk);
      });

      req.on("end", function(){
        file_token = new_file.close();
	      res.end(file_token);
      });
	
			break;

		case "PUT":

			// todo: update the stored data at the specified URL 

			res.end();

			break;

		case "DELETE":

			// todo: remove the data stored at the specified URL 

			res.end();

			break;

    case "OPTIONS":

      // support for OPTIONS is required to support cross-domain requests (CORS)
      var allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
      var allowed_headers = ["Accept", "Accept-Version", "Content-Type", "Api-Version", "Origin", "X-Requested-With","Range","X_FILENAME"];

      res.setHeader("Access-Control-Allow-Methods", allowed_methods.join(","));
      res.setHeader("Access-Control-Allow-Headers", allowed_headers.join(","));
      res.writeHead(204);
      res.end();

			break;

		default:
			res.writeHead(405);
			res.end("method " + req.method + " is not supported");
	}

}).listen(SERVER_PORT);
