var BinaryServer = require("binaryjs").BinaryServer;
var fs = require("fs");
var log = require("../jlog.js");

log.message(log.INFO, "Starting server");
var server = BinaryServer({port:5000});

server.on("connection", function(client){
	log.message(log.DEBUG, "Connection event fired");
	client.on("stream", function(stream, meta){
		log.message(log.DEBUG, "stream event fired");
		var file = fs.createWriteStream(meta.file);
		log.message(log.DEBUG, "streaming file?");
		stream.pipe(file);

		stream.on("end", function(){
			log.message(log.DEBUG, "stream.end event fired");
			client.close();
		});
	});
});
