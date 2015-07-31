// parse superblock and pass unique blocks back to parent
var unique_blocks = [];
var superblock = null;

process.on("message", function(message){
	console.log("message received");
	if(message.hasOwnProperty("superblock")){
		console.log("superblock received");
		superblock = message.superblock;
		for(var inode in superblock){
			if(superblock.hasOwnProperty(inode)){
				console.log("inode selected");
				var selected_inode = superblock[inode];
				for(block in selected_inode.blocks){
					console.log("block selected");
					var selected_block = selected_inode.blocks[block];
					console.log("block hash: " + selected_block.block_hash);
					if(unique_blocks.indexOf(selected_block.block_hash) === -1){
						unique_blocks.push(selected_block.block_hash);
						process.send({unique_block:selected_block.block_hash});
					}
				}
			}
		}
		// todo: tell parent we're done & trigger deallocation of child
	}
});
