var fs = require("fs");

// get filename from commandline 
var filename = process.argv[2];
console.log("Analyzing " + filename);

// get first block from file
fs.open(filename, "r", function(status, fd){
	if(status){
		console.log(status);
		return;
	}
	var buffer = new Buffer(1048576);
	fs.read(fd, buffer, 0, 1048576, 0, function(err, num){
		console.log(JSON.stringify(analyze_block(buffer), null, 4));
	});
});

// examine the contents of a block to generate metadata
function analyze_block(block){

    var result = {};
    result.type = "unknown";

    // test for WAVE
    if(block.toString("utf8", 0, 4) === "RIFF"
        & block.toString("utf8", 8, 12) === "WAVE"
        & block.readUInt16LE(20) == 1){

        result.type = "wave";
        result.size = block.readUInt32LE(4);
        result.channels = block.readUInt16LE(22);
        result.bitrate = block.readUInt32LE(24);
        result.resolution = block.readUInt16LE(34);
        result.duration = ((((result.size * 8) / result.channels) / result.resolution) / result.bitrate);
    }

    // todo: test for MP3
	try{
		// debug
		//console.log(">>>" + block.readUInt16LE(13) + "<<<");
	
		var mp3_header = null;
	
		for(var i = 0; (i+4) <= block.length; i++){
			mp3_header = block.readUInt32BE(i);

			//console.log(mp3_header);

			if((mp3_header & 0xFFE00000) == ~~0xFFE00000){
				//console.log("found mp3 sync word");

				var sync_word = block.readUInt32BE(i).toString(2);

				if(sync_word.substr(11,2) === "11"){
					if(sync_word.substr(13,2) === "01"){
						console.log("layer indicator matches mp3");

						console.log(">>>" + sync_word + "<<<");
					}
				}

			} else {
				//console.log("not mp3 sync word");
			}
		}

	} catch(ex){
		console.log("not enough data to analyze for mp3");
	}

    // todo: test for FLAC
    // todo: test for AIFF
    // todo: test for ...

    return result;
}
