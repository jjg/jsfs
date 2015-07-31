// parse superblock and pass unique blocks back to parent
var fs = require("fs");

var unique_blocks = [];
var superblock = null;

process.on("message", function(message){
	//console.log("message received");
	//console.log(JSON.stringify(message));
	if(message.hasOwnProperty("load_superblock")){
		//console.log("loading superblock from disk");
		superblock = JSON.parse(fs.readFileSync("./blocks/superblock.json"));
		//console.log("superblock loaded from disk");
		process.send({superblock_loaded:true});
		//console.log("loaded message sent to parent");
	}
	if(message.hasOwnProperty("process_superblock")){
		//console.log("process_superblock message received");
		//superblock = message.superblock;
		for(var inode in superblock){
			if(superblock.hasOwnProperty(inode)){
				//console.log("inode selected");
				var selected_inode = superblock[inode];
				for(block in selected_inode.blocks){
					//console.log("block selected");
					var selected_block = selected_inode.blocks[block];
					//console.log("block hash: " + selected_block.block_hash);
					if(unique_blocks.indexOf(selected_block.block_hash) === -1){
						unique_blocks.push(selected_block.block_hash);
						process.send({unique_block:selected_block.block_hash});
					}
				}
			}
		}
		// todo: tell parent we're done & trigger deallocation of child
		console.log("done processing superblock");
	}
});
