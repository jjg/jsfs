// jsfs - Javascript filesystem with a REST interface

// *** CONVENTIONS ***
// strings are double-quoted, variables use underscores, constants are ALL CAPS

// *** UTILITIES  & MODULES ***
var http = require("http");

// these may be broken-out into individual files once they have been debugged
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

// *** CONFIGURATION ***
// configuration values will be stored in an external module once we know what they all are
var SERVER_PORT = 7302;		// the port the HTTP server listens on
log.level = 0;				// the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error

// at the highest level, jsfs is an HTTP server that accepts GET, POST, PUT, DELETE and OPTIONS methods
http.createServer(function(req, res){

	log.message(log.INFO, "Received " + req.method + " requeset.");

	switch(req.method){

		case "GET":

			// todo: return the file at the requested path

			res.end();

			break;

		case "POST":

			// todo: store the posted data at the specified path

			res.end();

			break;

		case "PUT":

			// todo: update the stored data at the specified path

			res.end();

			break;

		case "DELETE":

			// todo: remove the data stored at the specified path

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
