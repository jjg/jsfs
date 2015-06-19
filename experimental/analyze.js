var fs = require("fs");

// todo: get filename from commandline 
var filename = process.argv[2];
console.log("reading " + filename);

// todo: get first block from file
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
    // todo: test for FLAC
    // todo: test for AIFF
    // todo: test for ...

    return result;
}
