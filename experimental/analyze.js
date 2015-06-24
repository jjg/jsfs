var fs = require("fs");

// get filename from commandline 
var filename = process.argv[2];
console.log("Analyzing " + filename);

// get file stats
fs.stat(filename, function(err, stats){
	if(err){
		console.log(err);
		return;
	}

	// get first block from file
	fs.open(filename, "r", function(status, fd){
		if(status){
			console.log(status);
			return;
		}
		var buffer = new Buffer(1048576);
		fs.read(fd, buffer, 0, 1048576, 0, function(err, num){
			console.log("---Analyzing as WAVE --------------------------");
			console.log(JSON.stringify(analyze_wave(buffer), null, 4));
			console.log("-----------------------------------------------\n");
			console.log("---Analyzing as MP3 ---------------------------");
			console.log(JSON.stringify(analyze_mp3(buffer, stats.size), null, 4));
			console.log("-----------------------------------------------\n");
			console.log("---Analyzing as FLAC --------------------------");
			console.log(JSON.stringify(analyze_flac(buffer), null, 4));
			console.log("-----------------------------------------------\n");
		});
	});
});

// examine the contents of a block to generate metadata
function analyze_wave(block){

    var result = {};
    result.type = "unknown";

    // test for WAVE
    if(block.toString("utf8", 0, 4) === "RIFF"
        & block.toString("utf8", 8, 12) === "WAVE"
        & block.readUInt16LE(20) == 1){

        result.type = "wave";
        result.size = block.readUInt32LE(4);
        result.channels = block.readUInt16LE(22);
		result.sample_rate = block.readUInt16LE(24);
        result.sample_resolution = block.readUInt16LE(34);
		result.bitrate = (result.sample_rate * result.sample_resolution) * result.channels; 
        result.duration = (result.size * 8) / result.bitrate;
    }

	return result;
}

function analyze_mp3(block, length){

	// MPEG property look-up table objects
	var mpeg_version = {
		"00":2.5,
		"01":0,
		"10":2,
		"11":1
	};

	var mpeg_layer = {
		"00":0,
		"01":3,
		"10":2,
		"11":1
	};

	var sampling_rate_mpeg1 = {
		"00":44100,
		"01":48000,
		"10":32000,
		"11":0
	};

	var bit_rate_mpeg1_layer3 = {
		"0000":0,
		"0001":32000,
		"0010":40000,
		"0011":48000,
		"0101":64000,
		"0110":80000,
		"0111":96000,
		"1000":112000,
		"1001":128000,
		"1010":160000,
		"1011":192000,
		"1100":224000,
		"1101":256000,
		"1110":320000,
		"1111":0
	};

	var channel_mode = {
		"00":2,
		"01":2,
		"10":2,
		"11":1
	};

	var result = {};
	result.type = "unknown";

	try{
		var mp3_header = null;
	
		for(var i = 0; (i+4) <= block.length; i++){
			mp3_header = block.readUInt32BE(i);

			if((mp3_header & 0xFFE00000) == ~~0xFFE00000){

				// extract sync word as string representation of binary value
				var sync_word = block.readUInt32BE(i).toString(2);

				result.type = "mp3";
				result.size = length;
				result.channels = channel_mode[sync_word.substr(24,2)];
				result.sample_rate = sampling_rate_mpeg1[sync_word.substr(20,2)];
				result.sample_resolution = 16; // todo: see if this is fixed or variable for mp3?
				result.bitrate = bit_rate_mpeg1_layer3[sync_word.substr(16,4)];
				result.duration = (result.size * 8) / result.bitrate;

				// we found a sync block so we're done
				//break;

			} else {
				//console.log("not mp3 sync word");
			}
		}

	} catch(ex){
		console.log("not enough data to analyze for mp3");
	}

    return result;
}

function analyze_flac(block){
	var result = {};
	result.type = "unknown";

	//try{

		for(var i=0;(i+2)<= block.length;i++){							// scan the contents of the block 
			var flac_audio_frame_header = block.readUInt16BE(i);		// read the next 32 bits (4 bytes)

			if((flac_audio_frame_header & 0x7FFF) !== 0x7FFC){	// test for sync frame
				continue;
			}

			console.log("flac audio frame header: >>>" + flac_audio_frame_header.toString(2) + "<<<");

			result.type = "flac";
			result.sample_rate = flac_audio_frame_header.toString(2).substr(20,4);
/*
				result.size = block.readUInt32LE(4);
				result.channels = block.readUInt16LE(22);
				result.sample_rate = block.readUInt16LE(24);
				result.sample_resolution = block.readUInt16LE(34);
				result.bitrate = (result.sample_rate * result.sample_resolution) * result.channels;
				result.duration = (result.size * 8) / result.bitrate;
*/

				// only analyze the first one for now
			break;
		}
	//}catch(ex){
	//	console.log("exception analyzing for FLAC: " + ex);
	//}

    return result;

}

function analyze_aiff(block){
}

function analyze_alac(block){
}

function analyse_aac(block){
}
