// loop through superblock and storage locations to establish storage utilization
var fs = require("fs");

process.on("message", function(message){
	console.log("storage_utilization_initializer received message");
	console.log(JSON.stringify(message));
	if(message.hasOwnProperty("superblock") && message.hasOwnProperty("storage_locations")){
		console.log("storage_utilization_initializer received superblock & storage_locations");
		var superblock = message.superblock;
		var storage_locations = message.storage_locations;
		for(var inode in superblock){
			if(superblock.hasOwnProperty(inode)){
				console.log("storage_utilization_initializer inode selected");
				var selected_inode = superblock[inode];
				for(block in selected_inode.blocks){
					var selected_block = selected_inode.blocks[block];
					console.log("storage_utilization_initializer block selected " + selected_block.block_hash);
					for(var storage_location in storage_locations){
						var selected_storage_location = storage_locations[storage_location];
						if(fs.existsSync(selected_storage_location.path + selected_block.block_hash)){
							// todo: update block's last_seen property in the live object back at the parent?
							var block_data = fs.readFileSync(selected_storage_location.path + selected_block.block_hash);
							selected_storage_location.usage += block_data.length;
						}
					}
				}
			}
		}
		process.send({storage_locations:storage_locations});
		// todo: signal to the parent that we're done & deallocate child
	}
});
