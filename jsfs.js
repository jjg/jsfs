// jsfs - deduplicating filesystem with a REST interface

// includes
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');

// config
var storagePath = './thebits/';

// globals
files = {};

// store a file
function storeFile(filename, contents){
	
	console.log('storeFile');
	console.log('filename: ' + filename);
	console.log('content length: ' + contents.length);
	
	// check for existing filename
	if(typeof files[filename] === 'undefined'){
		
		// hash the contents
		var contentsHash = null;
		var shasum = crypto.createHash('sha1');
		shasum.update(contents);
		contentsHash = shasum.digest('hex');
		
		console.log('contentsHash: ' + contentsHash);
		
		// write file to disk under hash-based filename
		try{
			
			var storageFile = storagePath + contentsHash;
			var storageSize = contents.length;
			
			if(!fs.existsSync(storageFile)){
				
				fs.writeFileSync(storageFile, contents);
				
			} else {
				
				storageSize = 0;
				
			}
			
			// add filename to index
			console.log('adding file ' + filename + ' to index');
			files[filename] = {hash:contentsHash,contentSize:contents.length,onDiskSize:storageSize};
			
			console.log(files[filename]);
			
			return 'OK';
				
		} catch(ex){
				
			console.log(ex);
				
			return 'ERR';
				
		}
		
	} else {
		
		return 'EXISTS';
		
	}
}

// retrieve a file
function getFile(filename){

	var contents = null;
	var contentsHash = files[filename].hash;

	if(contentsHash){
		
		var storageFile = storagePath + contentsHash;
		
		if(fs.existsSync(storageFile)){
			
			contents = fs.readFileSync(storageFile, 'base64');
					
		}
	}
	
	return contents;
}

// retreive an index of files
function getIndex(){
	
	return JSON.stringify(files);
	
}

// start the server
http.createServer(function(req, res){
	
	// determine and route request
	console.log('Received request: ' + req.method);
	
	var filename = null;
	var contents = null;
	
	switch(req.method){
		
		case 'GET':
			
			// if root is requested, return index
			if(req.url === '/'){
				
				res.writeHead(200);
				res.end(getIndex());
				
				break;
			}
			
			// extract filename (can look like a path too)
			filename = req.url;
			
			contents = getFile(filename);
			
			if(contents.length > 0){
				
				res.writeHead(200);
				res.end(contents);
				
			} else {
				
				res.writeHead(404);
				res.end('file not found');
				
			}
			
			break;
			
		case 'POST':
			
			// extract filename (can look like a path too)
			filename = req.url;
			var contentLength = req.headers['content-length'];
			
			console.log(req.headers);
			
			// extract file contents
			contents = new Buffer(0);
			
			req.on('data', function(data){
				contents = new Buffer.concat([contents, data]);
			});
			
			req.on('end', function(){
				
				var storeResult = storeFile(filename, contents);
				
				console.log('storeResult: ' + storeResult);
				
				if(storeResult === 'OK'){
					res.writeHead(200);
					res.end();
				}
				
				if(storeResult === 'EXISTS'){
					res.writeHead(500);
					res.end('file exists');
				}
				
				// if all else fails
				res.writeHead(500);
				res.end('unknown error');
				
			});

			break;
			
		case 'DELETE':
			deleteFile(req);
			break;
			
		default:
			res.end('???');
	}
	
	// print system stats
	console.log('-----------system stats----------------');
	console.log('filename\t\tcontent size\tsize on disk');
	for(var key in files){
		console.log(key + '\t\t' + files[key].contentSize + '\t' + files[key].onDiskSize);
	}
	console.log('---------------------------------------');
	
}).listen(1313, '127.0.0.1');