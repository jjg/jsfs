var http = require("http");

http.createServer(function(req,res){

	console.log("method: " + req.method);

	if(req.method === "POST"){
		
		req.on("data", function(chunk){
			console.log("chunk size: " + chunk.length);
		});

		req.on("end", function(){
			console.log("request ended");
			res.statusCode = 200;
			res.end();
		});
	} else {

		res.statusCode = 404;
		res.end();
	
	}

}).listen(5000);

console.log("server listening no port 5000");
