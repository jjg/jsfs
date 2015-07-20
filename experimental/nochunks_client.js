// experiments in forcing chunk size 
var BinaryClient = require("binaryjs").BinaryClient;
var fs = require("fs");
var log = require("../jlog.js");

var upload_start_time;
var upload_complete_time;

fs.readFile("./testfile.wav", function(err, data){
	if(err){
		log.message(log.ERROR, err);
		return;
	}

	log.message(log.INFO, "Connecting to server");

	//var client = new BinaryClient("ws://localhost:5000");
	var client = new BinaryClient("ws://66.170.14.251:5000");

	client.on("open", function(stream){
		log.message(log.DEBUG, "open event fired");

		upload_start_time = Date.now();

		var stream = client.createStream({file:"output.wav"});

		stream.on("close", function(){
			log.message(log.INFO, "Stream closed");
            var upload_complete_time = Date.now();
            upload_duration = upload_complete_time - upload_start_time;
            log.message(log.INFO, "Upload completed in " + upload_duration / 1000 + " seconds (" + ((data.length / (upload_duration / 1000) / 1024) / 1024) + " megabytes per second)");
		});

		log.message(log.DEBUG, "Writing data to stream");
		stream.write(data);
		log.message(log.DEBUG, "ending stream");
		stream.end();
	});	
});
