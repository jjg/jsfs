// parse superblock and pass unique blocks back to parent
var unique_blocks = [];
var log = require("./jlog.js");
var config = require("./config.js");

log.level = 0;
log.path = "./jlog.log";

process.on("message", function(message){
	if(message.superblock){
		var superblock = message.superblock;
		for(var inode in superblock){
			if(superblock.hasOwnProperty(inode)){
				var selected_inode = superblock[inode];
				for(block in selected_inode.blocks){
					var selected_block = selected_inode.blocks[block];
					if(unique_blocks.indexOf(selected_block.block_hash) === -1){
						unique_blocks.push(selected_block.block_hash);
						process.send({unique_block:selected_block.block_hash});
					}
				}
			}
			log.message(log.DEBUG, "\tUBI: processed inode " + inode);
		}
		process.send({processing_complete:true});
	}
});
