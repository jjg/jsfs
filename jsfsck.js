var fs = require("fs");
var config = require("./config.js");
var log = require("./jlog.js");

var superblock = {};
var storage_locations = config.STORAGE_LOCATIONS;
var unique_blocks = [];

// todo: backup superblock

// open backup superblock
load_superblock();

// loop over stored objects that do not have a media_duration property
for(inode in superblock){
	if(superblock.hasOwnProperty(inode)){
		var selected_file = superblock[inode];
		if(selected_file.media_type){
			log.message(log.INFO, "media_type " + selected_file.media_type + " " + selected_file.url);
		} else {
			log.message(log.WARN, "media_type missing " + selected_file.url);

			// check for blocks
			if(selected_file.blocks.length > 0){
				log.message(log.INFO, selected_file.blocks.length + " blocks in " + selected_file.url);

				// read first block of objects missing the media_type property
				log.message(log.INFO, "loading block 0 of " + selected_file.url);
				var selected_block = load_block(selected_file, 0);
				log.message(log.DEBUG, "selected_block.length: " + selected_block.length);
				if(selected_block){
					log.message(log.INFO, "block 0 loaded");
	
		            // analyze block and set media_type 
					var analysis_result = analyze_block(selected_block);
					log.message(log.INFO, "block analysis result: " + JSON.stringify(analysis_result));
	
					// if we found out anything useful, annotate the object's metadata
					selected_file.media_type = analysis_result.type;
					if(analysis_result.type != "unknown"){
						selected_file.media_size = analysis_result.size;
						selected_file.media_channels = analysis_result.channels;
						selected_file.media_bitrate = analysis_result.bitrate;
						selected_file.media_resolution = analysis_result.resolution;
						selected_file.media_duration = analysis_result.duration;
					}

					// write updated superblock to disk
					try{
						fs.writeFileSync(storage_path + "jsfsck_superblock.json", JSON.stringify(superblock));
						log.message(log.INFO, "updated superblock saved to disk");
					} catch(ex){
						log.message(log.ERR, "error saving updated superblock to disk: " + err);
					}

				} else {
					log.message(log.ERR, "unable to load block 0, cannot fix inode");
				}
			} else {
				log.message(log.ERROR, "no blocks to analyize in " + selected_file.url);
			}
		}
	}
}

log.message(log.INFO, "filesystem check complete");

// todo: when all objects have been updated, write superblock and print summary report

// utility functions
function load_superblock(){
    for(var location in config.STORAGE_LOCATIONS){
        if(config.STORAGE_LOCATIONS.hasOwnProperty(location)){
            var storage_path = config.STORAGE_LOCATIONS[location].path;
            try{
                // try the first storage device first
                // todo: loop through devices until a superblock is found
                superblock = JSON.parse(fs.readFileSync(config.STORAGE_LOCATIONS[0].path + "superblock.json"));
                log.message(log.INFO, "superblock loaded from disk");
                break;
            } catch(ex) {
                log.message(log.WARN, "unable to load superblock from disk: " + ex);
            }
        }
    }

    // stat each block to establish its current location and
    // the utilization of each storage location
    for(var storage_location in storage_locations){
        storage_locations[storage_location].usage = 0;
    }

    // use global unique_blocks for now
    for(var file in superblock){
        if(superblock.hasOwnProperty(file)){
            var selected_file = superblock[file];
            for(var block in selected_file.blocks){
                var selected_block = selected_file.blocks[block];
                for(var storage_location in storage_locations){
                    var selected_location = storage_locations[storage_location];
                    if(fs.existsSync(selected_location.path + selected_block.block_hash)){
                        selected_block.last_seen = selected_location.path;

                        // only count unique blocks per device
                        if(unique_blocks.indexOf(selected_block.block_hash) == -1){
                            unique_blocks.push(selected_block.block_hash);

                            // read the block to get the actual size (todo: change if this is too slow)
                            var block_data = fs.readFileSync(selected_location.path + selected_block.block_hash);
                            selected_location.usage = selected_location.usage + block_data.length;
                        }

                        break;
                    } else {
                        // todo: this warning should only get thrown if the block is never found,
                        // right now it gets thrown if the block isn't found everywhere; fix that
                        //log.message(log.WARN, "block " + selected_block.block_hash + " not found in " + selected_location.path);
                    }
                }

            }
        }
    }

    var stats = system_stats();
    log.message(log.INFO, stats.file_count + " files stored in " + stats.block_count + " blocks, " + stats.unique_blocks + " unique (" + Math.round((stats.unique_blocks / stats.block_count) * 100) + "%)");

    for(var storage_location in storage_locations){
        log.message(log.INFO, storage_locations[storage_location].usage + " of " + storage_locations[storage_location].capacity + " bytes used on " + storage_locations[storage_location].path);
    }
}

function system_stats(){

    var stats = {};
    stats.file_count = 0;
    stats.block_count = 0;
    stats.unique_blocks = 0;
    stats.unique_blocks_accumulator = [];

    for(var file in superblock){
        if(superblock.hasOwnProperty(file)){

            var selected_file = superblock[file];

            // count blocks
            stats.block_count = stats.block_count + selected_file.blocks.length;

            // accumulate unique blocks
            for(var i=0;i<selected_file.blocks.length;i++){

                // I think this can be done more efficiently, but this works for now
                if(stats.unique_blocks_accumulator.indexOf(selected_file.blocks[i].block_hash) == -1){
                    stats.unique_blocks_accumulator.push(selected_file.blocks[i].block_hash);
                }
            }

            // increment file count
            stats.file_count++;
        }
    }

    stats.unique_blocks = stats.unique_blocks_accumulator.length;
    return stats;
}

function load_block(inode, blocknumber){
	log.message(log.DEBUG, "got load_block");

	var block_data = null;

	for(var storage_location in storage_locations){
		log.message("searching location " + storage_location);
		var selected_location = storage_locations[storage_location];
		if(fs.existsSync(selected_location.path + inode.blocks[blocknumber].block_hash)){
			log.message(log.INFO, "found block " + inode.blocks[blocknumber].block_hash + " in " + selected_location.path);
			inode.blocks[blocknumber].last_seen = selected_location.path;
			block_data = fs.readFileSync(selected_location.path + inode.blocks[blocknumber].block_hash);
		} else {
			log.message(log.ERROR, "unable to locate block " + inode.blocks[blocknumber].block_hash + " in " + selected_location.path);
		}
	}

	return block_data;
}

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
