// experiments in forcing chunk size 
var http = require("http");
var fs = require("fs");
var log = require("../jlog.js");

var upload_start_time;
var upload_complete_time;

fs.readFile("./testfile.wav", function(err, data){
	if(err){
		log.message(log.ERROR, err);
		return;
	}

	// upload file
	var options = {
		hostname: "66.170.14.251",
		port: "5000",
		path: "/jjg/upload-tests/" + Date.now() + ".wav",
		method: "POST",
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Length": data.length
		}
	};

	var req = http.request(options, function(res){

		log.message(log.DEBUG, "File POST status: " + res.statusCode);

		res.setEncoding('utf8');

		res.on("data", function(chunk){
			//log.message(log.DEBUG, "File POST response body: " + chunk);
		});

		res.on("end", function(){
			var upload_complete_time = Date.now();
			upload_duration = upload_complete_time - upload_start_time;
			log.message(log.INFO, "Upload completed in " + upload_duration / 1000 + " seconds (" + ((data.length / (upload_duration / 1000) / 1024) / 1024) + " megabytes per second)");
		});

	});

	req.on("error", function(e){
		log.message(log.ERROR, "Error POSTing test file: " + e.message);
	});

	upload_start_time = Date.now();
	log.message(log.INFO, "Uploading file");
	req.write(data);
	req.end();

});
