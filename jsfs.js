// jsfs - deduplicating filesystem with a REST interface

// includes
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');

// load config
var config = require('./config.js');

// globals
files = {};

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

// todo: review this function and either update or discard
function updatePeers(){
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
}

/*
// retrieve a file
function getFile(filename, callback){
	
	// find most current revision
	var currentVersion = 0;

	// debug
	console.log('requested file ' + filename);
	
	// if a specific version is requested, try to return it
	if(filename.lastIndexOf('_FV_') > 0 && filename.substring(filename.lastIndexOf('_FV_')).length > 0){
		
		// get specific version
		filename + filename.substring(filename.lastIndexOf('_FV_'));
		
		// debug
		console.log('loading specific version ' + filename);
		
	} else {
		
		// get latest version
		while(typeof files[filename + '_FV_' + currentVersion] != 'undefined'){
			
			// debug
			console.log('found version ' + filename + '_FV_' + currentVersion);
			
			currentVersion++;
	
		}
		
		filename = filename + '_FV_' + (currentVersion - 1);
	}
	
	// debug
	console.log('loading file ' + filename);
		
	var contents = new Buffer('');
	
	if(typeof files[filename] != 'undefined'){
		
		// check for hashblocks
		var hashblocks = files[filename].hashblocks;
		
		if(hashblocks){
			
			var contentsArray = [];
		
			function updateContentsArray(index, content){
				
				contentsArray[index] = content;
				
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
					
					
					//fs.readFile(blockFile, function(err, fileContents){
						
					//	updateContentsArray(i, fileContents);
						
					//});
					
					
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
*/

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
		
		console.log('upgrading metadata');
		upgradeMetadata();
		
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

function upgradeMetadata(){
	
	var totalFiles = 0;
	var upgradedFiles = 0;
	
	for(var file in files){
		
		totalFiles++;
		
		// test each file for version extension
		if(file.lastIndexOf('_FV_') == -1){
	
			// add version 0 extension if none exists
			console.log('upgrading file key ' + file);
			
			var upgradedFileKey = file + '_FV_0';
			
			// upgrade depreciated version indicators
			if(file.substring(file.lastIndexOf('_')) == '_0'){
				
				upgradedFileKey = file.substring(0,file.lastIndexOf('_')) + '_FV_0';
				
				console.log('depreciated version indicator trimmed: ' + upgradedFileKey);
				
			}
			
			console.log('upgraded filekey: ' + upgradedFileKey);
			
			files[upgradedFileKey] = files[file];
			
			delete files[file];
			
			upgradedFiles++;
			
		} else {
			
			//console.log('no upgrade needed for filekey ' + file);
			
		}
	
	}
	
	// print results
	console.log('total files: ' + totalFiles);
	console.log('upgraded files: ' + upgradedFiles);
	
	// save updated metadata
	if(upgradedFiles > 0){
		saveMetadata();
	}
}

function getVersionedAddress(address){
	
	// check for existing address
	if(typeof files[address + '_FV_0'] != 'undefined'){

		// find most current revision
		var newVersion = 0;

		while(typeof files[address + '_FV_' + newVersion] != 'undefined'){
			newVersion++;
		}
		
		// set filename to incremented revision
		address = address + '_FV_' + newVersion;
		
	} else {
		// add base version to filename
		address = address + '_FV_0';
	}
	
	return address;
}

// pipelined reader
function getFile(address, result, block, end){
	
	// todo: refactor all this version stuff into shared code...
	var requestedAddress = address;
	
	// find most current revision
	var currentVersion = 0;
	
	// if a specific version is requested, try to return it
	if(address.lastIndexOf('_FV_') > 0 && address.substring(address.lastIndexOf('_FV_')).length > 0){
		// get specific version
		address + address.substring(address.lastIndexOf('_FV_'));
	} else {
		// get latest version
		while(typeof files[address + '_FV_' + currentVersion] != 'undefined'){
			currentVersion++;
		}
		address = address + '_FV_' + (currentVersion - 1);
	}
	
	if(typeof files[address] != 'undefined'){
		
		// check for hashblocks
		var hashblocks = files[address].hashblocks;
		
		if(hashblocks){
			
			result(200);
			
			// iterate over hashblocks
			for(var i=0;i<hashblocks.length;i++){
				
				// first check local filesystem
				var blockFile = config.storagePath + hashblocks[i];
				
				if(fs.existsSync(blockFile)){

					var aBlock = fs.readFileSync(blockFile);
			
					// return block
					block(aBlock);
					
				} else {
					
					console.log('block ' + hashblock[i] + ' missing!');
				}
			}
			
			end();
			
		} else {
			
			console.log('no hashblocks for ' + address + '!');
			
			result(500);
			end('no hashblocks found for this address');
			
		}
		
	} else {
		
		console.log('file not found locally, checking peers...');
		
		// todo: seems like all this peer stuff could be refactored elsewhere.
		// if peers are configured, check them
		if(config.peers.length > 0){
			
			// debug
			console.log('searching peers for requested address ' + requestedAddress);
			
			for(var j=0;j<config.peers.length;j++){
				
				var peer = config.peers[j];
				
				console.log('requesting address ' + requestedAddress + ' from ' + peer.host);
				
				// create a local copy if we find the file
				var localCopy = new hashStore(requestedAddress);
				
				http.get('http://' + config.peers[j].host + ':' + config.peers[j].port + requestedAddress, function(peerResponse){
					
					// debug
					console.log('peer request status: ' + peerResponse.statusCode);
						
					result(peerResponse.statusCode);
					
					peerResponse.on('data', function(chunk){
						
						// debug
						console.log('received data from peer');
						
						block(chunk);
						
						if(peerResponse.statusCode == 200){
							localCopy.write(chunk);
						}
						
					});
						
					peerResponse.on('error', function(error){
						end('error receiving data from peer: ' + error);
					});
					
					peerResponse.on('end', function(){
						end();
						
						if(peerResponse.statusCode == 200){
							localCopy.close();
						}
					});
					
				});
			}
			
		} else {
			console.log('no peers configured, giving up');
			result(404);
			end('no file at this address');
		}
		
	}
}

// "class" definitions
function hashStore(requestedAddress){
	
	// declare class-global properties
	this.address = null;
	this.inputBuffer = null;
	this.blockSize = null;
	this.fileMetadata = {};
	
	// initialize class-global properties
	this.init = function(requestedAddress){
		this.address = getVersionedAddress(requestedAddress);
		this.inputBuffer = new Buffer('');
		this.blockSize = parseInt(config.blockSize);  // todo: consider not referecing global stuff in here...
		this.fileMetadata.name = this.address;
		this.fileMetadata.created = Date.now();
		this.fileMetadata.hashblocks = [];
	};
	
	// reinitialize for a new file
	this.open = function(requestedAddress){
		this.init(requestedAddress);
	};
	
	// add data to the buffer
	this.write = function(chunk){
		this.inputBuffer = new Buffer.concat([this.inputBuffer, chunk]);
		this.processBuffer();
	};
	
	// flush any remaining buffer and add to index
	this.close = function(){
		
		this.processBuffer(true);
		
		files[this.address] = this.fileMetadata;
		saveMetadata();								// todo: again, consider not using global stuff in here...
		
	};
	
	this.processBuffer = function(flush){
		
		if(this.inputBuffer.length > this.blockSize || flush){
			
			if(flush){
				console.log('flushing remaining buffer');
			}
			
			// read next block
			var block = this.inputBuffer.slice(0, this.blockSize);
			
			// generate a hash of the block
			var blockHash = null;
			var shasum = crypto.createHash('sha1');
			shasum.update(block);
			blockHash = shasum.digest('hex');
		
			// save the block to disk
			var blockFile = config.storagePath + blockHash;  // todo: again, config globals probably don't belong here
			
			if(!fs.existsSync(blockFile)){
				
				console.log('storing block ' + blockFile);
				
				fs.writeFileSync(blockFile, block, 'binary');
				
			} else {
				
				console.log('duplicate block ' + blockHash + ' not stored');
			}
			
			// add the block to the metadata hashblock array
			this.fileMetadata.hashblocks.push(blockHash);
			
			// trim input buffer
			this.inputBuffer = this.inputBuffer.slice(this.blockSize);
			
		} else {
			console.log('received chunk');
		}
	};
	
	// call init
	this.init(requestedAddress);
	
}


// here's where the action starts...

// load the fs metadata
loadMetadata();

// start the server
http.createServer(function(req, res){
	
	var allowedHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With','Range','X_FILENAME'];
			
	// file name is the full path (simulates containers)
	var filename = require('url').parse(req.url).pathname;
	
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
				/*
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
				*/
			} else {
				
				getFile(filename, function(result){
					
					// send result
					res.writeHead(result);
					
				}, function(block){
					
					// send block
					res.write(block);
					
				}, function(message){
					
					// end response
					res.end(message);
				});
				
			}
			
			break;
			
		case 'POST':
			
			// extract file contents
			var contents = new hashStore(filename);
			
			req.on('data', function(data){
				contents.write(data);
			});
			
			req.on('end', function(){
				
				var storeResult = null;
				
				contents.close();
				
				// todo: return a legit result
				storeResult = "OK";
				
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
				
			});

			break;
			
		case 'DELETE':
			
			/*
			if(deleteFile(filename)){
				res.writeHead(200);
				res.end('file deleted');
			} else {
				res.writeHead(500);
				res.end('error deleting file');
			}
			*/
			
			res.writeHead(500);
			res.end('unsupported');
			
			break;
			
		default:
			res.end('???');
	}
	
	printStats();
	
}).listen(7302);
