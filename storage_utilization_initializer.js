// loop through superblock and storage locations to establish storage utilization
var fs = require("fs");
var log = require("./jlog.js");
var config = require("./config.js");

log.level = config.LOG_LEVEL;

process.on("message", function(message){
	//log.message(log.DEBUG, "\tSUI: message");
	if(message.hasOwnProperty("superblock") && message.hasOwnProperty("storage_locations")){
		var superblock = message.superblock;
		var storage_locations = message.storage_locations;
		for(var inode in superblock){
			//log.message(log.DEBUG, "\tSUI: inode");
			if(superblock.hasOwnProperty(inode)){
				var selected_inode = superblock[inode];
				for(block in selected_inode.blocks){
					//log.message(log.DEBUG, "\tSUI: block");
					var selected_block = selected_inode.blocks[block];
					for(var storage_location in storage_locations){
						//log.message(log.DEBUG, "\tSUI: storage_location");
						var selected_storage_location = storage_locations[storage_location];
						// todo: update block's last_seen property in the live object back at the parent?
						try{
							var block_stats = fs.statSync(selected_storage_location.path + selected_block.block_hash);
							selected_storage_location.usage += block_stats.size;
						} catch(error){
							log.message(log.ERROR, "\tSUI: missing block " + selected_storage_location.path + selected_block.block_hash);
						}
					}
				}
				log.message(log.DEBUG, "\tSUI: processed inode " + inode);
			}
		}
		process.send({storage_locations:storage_locations});
	}
});
