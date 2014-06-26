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
	
	// check for existing filename
	if(typeof files[filename] === 'undefined'){
		
		// hash the contents
		var contentsHash = null;
		var shasum = crypto.createHash('sha1');
		shasum.update(contents);
		contentsHash = shasum.digest('hex');
		
		// write file to disk under hash-based filename
		try{
			
			var storageFile = storagePath + contentsHash;
			var storageSize = contents.length;
			
			if(!fs.existsSync(storageFile)){
				
				fs.writeFileSync(storageFile, contents, 'binary');
				
			} else {
				
				storageSize = 0;
				
			}
			
			// add filename to index
			console.log('adding file ' + filename + ' to index');
			files[filename] = {hash:contentsHash,contentSize:contents.length,onDiskSize:storageSize};
			
			console.log(files[filename]);
			
			saveMetadata();
			
			return 'OK';
				
		} catch(ex){
				
			console.log(ex);
				
			return 'ERR';
				
		}
		
	} else {
		
		return 'EXISTS';
		
	}
}

function storeHashblock(hashblock, contents){
	
	try{
		
		var storageFile = storagePath + hashblock;
		var storageSize = contents.length;
		
		if(!fs.existsSync(storageFile)){
			
			fs.writeFileSync(storageFile, contents, 'binary');

		}
		
		return 'OK';
		
	} catch(ex) {
		
		return 'ERR';
		
	}
}

// eventually may be used for replication, unused now
function addToIndex(hashblock, contentSize, storageSize){
	
	// add filename to index
	console.log('adding file ' + filename + ' to index');
	files[filename] = {hash:hashblock,contentSize:contentSize,onDiskSize:storageSize};
			
	console.log(files[filename]);
			
	saveMetadata();
			
	return 'OK';
	
}

// retrieve a file
function getFile(filename){

	var contents = null;
	var contentsHash = files[filename].hash;

	if(contentsHash){
		
		var storageFile = storagePath + contentsHash;
		
		if(fs.existsSync(storageFile)){
			
			contents = fs.readFileSync(storageFile);
					
		}
	}
	
	return contents;
}

// retrieve a hashblock
function getHashblock(hashblock){

	var contents = null;

	if(hashblock){
		
		var storageFile = storagePath + hashblock;
		
		if(fs.existsSync(storageFile)){
			
			contents = fs.readFileSync(storageFile);
					
		}
	}
	
	return contents;
}

function deleteFile(filename){
	
	var deleted = false;
	
	var contents = null;
	var contentsHash = files[filename].hash;
	
	if(contentsHash){
		
		var storageFile = storagePath + contentsHash;
		
		if(fs.existsSync(storageFile)){
			
			try{
				
				// remove from index
				// todo: find a cleaner way to remove these references
				files[filename] = null;
	
				deleted = true;
				
				// if this is the last link, remove from filesystem
				// todo: find a more efficient way to do this
				var hashRefCount = 0;
				for(var key in files){
					
					if(files[key]){
						
						if(files[key].hash === contentsHash){
							hashRefCount++;
						}
						
					}
					
				}
				
				if(hashRefCount < 1){
					fs.unlinkSync(storageFile);
				}
				
				saveMetadata();
			
			} catch(ex) {
				
				console.log(ex);
				
			}
		}
	}
	
	return deleted;
}

// retreive an index of files
function getIndex(){
	
	return JSON.stringify(files);
	
}

// persist metadata to disk
function saveMetadata(){
	fs.writeFile(storagePath + 'metadata.json', JSON.stringify(files), function(err){
		if(err){
			console.log('error updating metadata');
		} else {
			console.log('metadata stored sucessfully');
		}
	});
}

// load metadata from disk
function loadMetadata(){
	
	try{
		
		files = JSON.parse(fs.readFileSync(storagePath + 'metadata.json'));
		
		console.log('metadata loaded sucessfully');
		
		printStats();
		
	} catch(ex) {
		
		console.log('error loading metadata, ');
		console.log(err);
		
	}
}

// print system stats
function printStats(){
	
	var totalFiles = 0;
	var totalSize = 0;
	var totalSizeOnDisk = 0;
	
	for(var key in files){
		
		if(files[key]){
			
			totalFiles++;
			totalSize = totalSize + files[key].contentSize;
			totalSizeOnDisk = totalSizeOnDisk + files[key].onDiskSize;
			
		}
		
	}
	
	console.log('\n---------------system stats----------------\n');
	
	console.log('Total number of files: ' + totalFiles);
	console.log('Total number of bytes stored: ' + totalSize);
	console.log('Total number of bytes on disk: ' + totalSizeOnDisk);
	console.log('Deduplication rate: ' + ((totalSizeOnDisk / totalSize) * 100) + '%');
	
	console.log('\n-------------------------------------------\n');

}

// load the fs metadata
loadMetadata();

// start the server
http.createServer(function(req, res){
	
	var allowedHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With','Range','X_FILENAME'];
			
	// file name is the full path (simulates containers)
	var filename = req.url;
	var contents = null;
	
	// debug
	console.log(req.method);
	
	res.setHeader('Access-Control-Allow-Origin', '*');
	
	// determine and route request
	switch(req.method){
		
		case 'OPTIONS':
			
			//res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
			res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
	
			res.writeHead(204);
			res.end();
			
			break;
		
		case 'GET':
			
			// if root is requested, return index
			if(req.url === '/'){
				
				res.writeHead(200);
				res.end(getIndex());
				
				break;
			}
			
			// if block is requested, use special block reader
			if(filename.substring(0, 11) === '/hashblock/'){
				
				// extract the hashblock from the filename
				var hashblock = filename.substring(11);
				
				contents = getHashblock(hashblock);
				
			} else {
				
				contents = getFile(filename);
				
			}
			
			if(contents.length > 0){
				
				res.writeHead(200);
				res.end(contents);
				
			} else {
				
				res.writeHead(404);
				res.end('file not found');
				
			}
			
			break;
			
		case 'POST':
			
			// extract file contents
			contents = new Buffer('');
			
			req.on('data', function(data){
				
				contents = new Buffer.concat([contents, data]);
				
			});
			
			req.on('end', function(){
				
				var storeResult = null;
				
				// skip hashing if storing a block directly
				if(filename.substring(0, 11) === '/hashblock/'){
					
					// extract the hashblock from the filename
					var hashblock = filename.substring(11);
					
					storeResult = storeHashblock(hashblock, contents);
					
				} else {
					
					storeResult = storeFile(filename, contents);
					
				}
				
				if(storeResult === 'OK'){
					//res.setHeader('Access-Control-Allow-Origin', '*');
					res.writeHead(200);
					res.end();
				}
				
				if(storeResult === 'EXISTS'){
					//res.setHeader('Access-Control-Allow-Origin', '*');
					res.writeHead(500);
					res.end('file exists');
				}
				
				/*
				// if all else fails
				res.writeHead(500);
				res.end('unknown error');
				*/
				
			});

			break;
			
		case 'DELETE':
			
			if(deleteFile(filename)){
				res.writeHead(200);
				res.end('file deleted');
			} else {
				res.writeHead(500);
				res.end('error deleting file');
			}
			
			break;
			
		default:
			res.end('???');
	}
	
	printStats();
	
}).listen(1313, '127.0.0.1');