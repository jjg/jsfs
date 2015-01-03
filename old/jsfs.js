// jsfs - deduplicating filesystem with a REST interface

// includes
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');

// load config
var config = require('./config.js');

// globals
files = {};

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
				
				http.get('http://' + peer.host + ':' + peer.port + requestedAddress, function(peerResponse){
					
					// debug
					console.log('peer ' + peer.host + ' request status: ' + peerResponse.statusCode);
						
					//result(peerResponse.statusCode);
					
					peerResponse.on('data', function(chunk){
						
						// debug
						console.log('received data from peer ' + peer.host);
						
						block(chunk);
						
						if(peerResponse.statusCode == 200){
							localCopy.write(chunk);
						}
						
					});
						
					peerResponse.on('error', function(error){
						end('error receiving data from peer ' + peer.host + ' : ' + error);
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

// validate authentication credentials
function authorized(req){
	
	var authenticated = false;
	
	var header=req.headers['authorization']||'',        // get the header
		token=header.split(/\s+/).pop()||'',            // and the encoded auth token
		auth=new Buffer(token, 'base64').toString(),    // convert from base64
		parts=auth.split(/:/),                          // split on colon
		username=parts[0],
		password=parts[1];
	
	if(username === config.username && password === config.password){
		authenticated = true;
	}
	
	return authenticated;
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
			
			break;
			
		case 'POST':
			
			// authorize request
			if(authorized(req)){
			
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

			} else {
				
				// request authorization
				res.setHeader('WWW-Authenticate', 'Basic');
				res.writeHead(401);
				res.end('authorization required to POST');
				
			}
			
			break;
			
		case 'DELETE':
			
			res.writeHead(500);
			res.end('unsupported');
			
			break;
			
		default:
			res.end('???');
	}
	
	printStats();
	
}).listen(7302);
