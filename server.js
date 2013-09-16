var http = require('http');

http.createServer(function(req, res){
	
	// route by method
	console.log(req.method);
	
	switch(req.method) {
		case 'GET':
			console.log('GETting');
			break;
		case 'POST':
			console.log('POSTing');
			break;
		case 'PUT':
			console.log('PUTting');
			break;
		case 'DELETE':
			console.log('DELETEing');
			break;
	}
		
	
	// route by url

	console.log(req.url);
	
	
	res.writeHead(200, {'Content-Type':'text/plain'});
	res.end('Hello World\n');
	
	
}).listen(1313, '127.0.0.1');
