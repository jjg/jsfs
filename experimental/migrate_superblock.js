var fs = require("fs");
var crypto = require("crypto");

// open superblock file
console.log("Loading superblock...");
var superblock = JSON.parse(fs.readFileSync("superblock.json"));
console.log("Superblock loaded, indexing inodes...");
var inodes_remaining = 0;
for(inode in superblock){
	if(superblock.hasOwnProperty(inode)){
		inodes_remaining++;
	}
}
console.log("Superblock indexed, " + inodes_remaining + " inodes to process");

// load next inode
for(inode in superblock){
	if(superblock.hasOwnProperty(inode)){
		var selected_inode = superblock[inode];

		// generate inode filename
		var shasum = crypto.createHash("sha1");
		shasum.update(selected_inode.url);
		var inode_filename = shasum.digest("hex") + ".json";
		console.log("Inode filename: " + inode_filename);

		// check if inode file exists
		try{
			// if inode file exists, load existing file
			var existing_inode = JSON.parse(fs.readFileSync(inode_filename));
			console.log("Inode file already exists, comparing versions...");
			// compare versions
			if(inode.version > existing_inode.version){
				// replace existing file if the current inode is newer
				console.log("Replacing existing inode file with newer version");
				fs.writeFileSync(inode_filename, JSON.stringify(selected_inode));
			}
		}catch(ex){
			// if inode doesn't exist, save the one we have
			console.log("Writing inode file to disk");
			fs.writeFileSync(inode_filename, JSON.stringify(selected_inode));
		}

		inodes_remaining--;
		console.log("Inode " + selected_inode.fingerprint + " processed, " + inodes_remaining + " inodes remaining");
	}
}

