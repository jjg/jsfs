// jsfs - deduplicating filesystem with a REST interface

// includes
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');

// load config
var config = require('./config.js');

// globals
files = {};

// store a file
function storeFile(filename, contents, overwrite){
	
	// check for existing filename
	if(typeof files[filename] === 'undefined' || overwrite){
		
		// init file metadata
		var fileMetadata = {};
		fileMetadata.name = filename;
		fileMetadata.created = Date.now();
		
		// generate hashblocks
		var hashblocks = [];
		var offset = 0;
		
		// slice and store contents
		for(var i=0;i<contents.length;i = i + config.blockSize){
			
			// grab a block of the contents
			var block = contents.slice(i, i + config.blockSize);
			
			// generate a hash of the block
			var blockHash = null;
			var shasum = crypto.createHash('sha1');
			shasum.update(block);
			blockHash = shasum.digest('hex');
		
			// save the block to disk
			var blockFile = config.storagePath + blockHash;
			
			if(!fs.existsSync(blockFile)){
				
				fs.writeFileSync(blockFile, block, 'binary');
				
			} else {
				
				console.log('duplicate block ' + blockHash + ' not stored');
			}
			
			// add the block to the hashblock array
			hashblocks.push(blockHash);
		}
		
		// add the hashblock array to the file metadata
		fileMetadata.hashblocks = hashblocks;
		
		// add the file metadata to the index
		files[filename] = fileMetadata;
		
		saveMetadata();
		
		// update peer metadata
		if(config.peers.length > 0){
			
			var peers = config.peers;
			var fileMetaJSON = JSON.stringify(fileMetadata);
			
			// debug
			console.log(peers.length + ' peers configured, sending updates');
			
			// submit file metadata to each peer
			for(var j=0;j<peers.length;j++){
				
				try{
					var req_options = {
					host: peers[j].host,
					path: '/filemeta/',
					port: peers[j].port,
					method: 'POST',
					headers: {
						'User-Agent': 'jsfs/0.0.1',
						'Accept': '*/*',
						'Content-Type': 'application/x-www-form-urlencoded',
						'Content-Length': Buffer.byteLength(fileMetaJSON)
					}};
				
					var peerClient = http.request(req_options, function(peerResponse){
						
						var buffer = '';
						
						peerResponse.on('data', function(chunk){
							buffer += chunk;
						});
							
						peerResponse.on('end', function(){
						
							// debug
							console.log('got response from jsfs peer');
							
							console.log(buffer);
					
							// todo: maybe update peer list based on response (or lack of)?
							
						});
						
						peerResponse.on('error', function(err){
							console.log('got error updating peer');
							console.log(err);
						});
						
					});
					
					peerClient.on('error', function(err){
						console.log('got error updating peer');
						console.log(err);
					});
					
					// issue the service request
					peerClient.write(fileMetaJSON);
					peerClient.end();
					
				} catch(ex){
					
					console.log('an exception occured contacting configured peer');
					console.log(ex);
					
				}
				
			}
		}
		
		return 'OK';
		
	} else {
		
		return 'EXISTS';
		
	}
}


function storeHashblock(hashblock, contents){
	
	try{
		
		var storageFile = config.storagePath + hashblock;
		
		if(!fs.existsSync(storageFile)){
			
			console.log('storing hashblock ' + hashblock);
			
			fs.writeFileSync(storageFile, contents, 'binary');

		} else {
			
			console.log('duplicate hashblock ' + hashblock + ' not stored');
			
		}
		
		return 'OK';
		
	} catch(ex) {
		
		return 'ERR';
		
	}
}


// used for federation
function addToIndex(fileMetadata){
	
	// add filename to index
	console.log('adding file ' + fileMetadata.name + ' to index');
	
	// only if it's not already there
	if(typeof files[fileMetadata.name] === 'undefined'){
		
		files[fileMetadata.name] = fileMetadata;
				
		console.log(files[fileMetadata.name]);
				
		saveMetadata();
				
		return 'OK';
	
	} else {
		
		return 'EXISTS';
		
	}
	
}


// retrieve a file
function getFile(filename, callback){
	
	var contents = new Buffer('');
	
	if(typeof files[filename] != 'undefined'){
		
		// check for hashblocks
		var hashblocks = files[filename].hashblocks;
		
		if(hashblocks){
			
			var contentsArray = [];
		
			function updateContentsArray(index, content){
				
				contentsArray[index] = content;
				
				// debug
				console.log('hashblocks.length: ' + hashblocks.length);
				console.log('contentsArray.length: ' + contentsArray.length);
				
				// once we have all the blocks, lump them together and return
				if(contentsArray.length === hashblocks.length){
			
					contents = Buffer.concat(contentsArray);
					
					callback(contents);
					
				}
			}
			
			// iterate over hashblocks
			for(var i=0;i<hashblocks.length;i++){
				
				// first check local filesystem
				var blockFile = config.storagePath + hashblocks[i];
				
				if(fs.existsSync(blockFile)){

					// todo: use non-sync read for this (sync fixes out-of-order bug,
					// but has perf. penalties and won't work for federation)
					updateContentsArray(i, fs.readFileSync(blockFile));
					
					/*
					fs.readFile(blockFile, function(err, fileContents){
						
						updateContentsArray(i, fileContents);
						
					});
					*/
					
				} else {
					
					// this is where we check other nodes for the blockfile
					if(config.peers.length > 0){
			
						// debug
						console.log('checking for block ' + hashblocks[i] + ' on peers');
						
						var peers = config.peers;
						
						for(var j=0;j<peers.length;j++){
							
							// debug
							console.log('requesting:');
							console.log('http://' + peers[j].host + ':' + peers[j].port + '/hashblock/' + hashblocks[i]);
							
							http.get('http://' + peers[j].host + ':' + peers[j].port + '/hashblock/' + hashblocks[i], function(peerResponse){
								
								var buffer = '';
								
								peerResponse.on('data', function(chunk){
									
									// debug
									//console.log('got data');
									
									buffer += chunk;
								});
									
								peerResponse.on('end', function(){
								
									// debug
									console.log('got end');
									
									console.log('got response from jsfs peer');
									console.log('length: ' + buffer.length);
									
									updateContentsArray(i, buffer);
									
									// cache the retreived hashblock locally
									storeHashblock(hashblocks[i], buffer);
									
									// todo: maybe update peer list based on response (or lack of)?
									
								});
								
							});
						}
						
					} else {
					
						console.log('blockfile ' + blockFile + ' missing!');
					
					}
				}
			}
			
		} else {
			
			console.log('no hashblocks found for file ' + filename);
			
			callback(contents);
			
		}
		
	} else {
		
		console.log('file ' + filename + ' not found in index');
		
		callback(contents);
	}
}


// retrieve a hashblock
function getHashblock(hashblock){

	var contents = null;

	if(hashblock){
		
		var storageFile = config.storagePath + hashblock;
		
		if(fs.existsSync(storageFile)){
			
			// debug
			console.log('hashblock exists');
			
			contents = fs.readFileSync(storageFile);
					
		} else {
			
			// debug
			console.log('hashblock not found');
		}
	}
	
	return contents;
}

function deleteFile(filename){
	
	// note: actually deleting files is too much work
	// to do within a single HTTP request, so for now
	// we just "unlink" the file by removing it from
	// the index, but there is a todo: to create an
	// out-of-band task that deals with orphaned blocks
	// stored on disk
	
	var deleted = false;
	
	// remove from index
	try {

		// todo: find a cleaner way to remove these references
		files[filename] = null;

		deleted = true;
		
		saveMetadata();
		
	} catch(ex) {
		
		console.log('error removing file from index: ' + ex);
		
	}
	
	return deleted;
}

// retreive an index of files
function getIndex(){
	
	// todo: now that file meta is getting bigger, may want to slim this down
	return JSON.stringify(files);
	
}

// persist metadata to disk
function saveMetadata(){
	fs.writeFile(config.storagePath + 'metadata.json', JSON.stringify(files), function(err){
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
		
		files = JSON.parse(fs.readFileSync(config.storagePath + 'metadata.json'));
		
		console.log('metadata loaded sucessfully');
		
		printStats();
		
	} catch(ex) {
		
		console.log('error loading metadata, ');
		console.log(ex);
		
	}
}

// print system stats
function printStats(){
	
	var totalFiles = 0;
	var totalBlocks = 0;
	
	for(var key in files){
		
		if(files[key]){
			
			totalFiles++;
			totalBlocks = totalBlocks + files[key].hashblocks.length;
			
		}
		
	}
	
	console.log('\n---------------system stats----------------\n');
	
	console.log('Total number of files: ' + totalFiles);
	console.log('Total number of blocks: ' + totalBlocks + ' (' + ((totalBlocks * config.blockSize) / 1048576) + 'MB)');
	
	console.log('\n-------------------------------------------\n');

}

// load the fs metadata
loadMetadata();

// start the server
http.createServer(function(req, res){
	
	var allowedHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With','Range','X_FILENAME'];
			
	// file name is the full path (simulates containers)
	var filename = require('url').parse(req.url).pathname;
	var contents = null;
	
	res.setHeader('Access-Control-Allow-Origin', '*');
	
	// determine and route request
	switch(req.method){
		
		case 'OPTIONS':
			
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
				
				// todo: this might need attention...response code is redundant
				
				// extract the hashblock from the filename
				var hashblock = filename.substring(11);
				
				// debug
				console.log('hasblock ' + hashblock + ' requested from peer');
				
				contents = getHashblock(hashblock);
				
				if(contents && contents.length > 0){
				
					res.writeHead(200);
					res.end(contents);
						
				} else {
					
					res.writeHead(404);
					res.end('file not found');
					
				}
				
			} else {
				
				getFile(filename, function(c){
					
					contents = c;
					
					if(contents && contents.length > 0){
				
						res.writeHead(200);
						res.end(contents);
						
					} else {
						
						res.writeHead(404);
						res.end('file not found');
						
					}
				});
				
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
					
				} else if(filename.substring(0, 10) === '/filemeta/'){
				
					var fileMetadata = JSON.parse(contents);
					
					// debug
					console.log('adding remote file ' + fileMetadata.name + ' to local index');
					
					storeResult = addToIndex(fileMetadata);
				
				} else {
					
					storeResult = storeFile(filename, contents, true);
					
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
	
}).listen(7302);
