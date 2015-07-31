// parse superblock and pass unique blocks back to parent
var unique_blocks = [];

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
		}
		// todo: tell parent we're done & trigger deallocation of child
		process.send({processing_complete:true});
	}
});
