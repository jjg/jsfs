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

		// TODO: check if inode file exists
		// var existing_inode = JSON.parse(fs.readFileSync(inode_filename));

		// TODO: if inode file exists, load existing file
		// TODO: compare versions
		// TODO: replace existing file if the current inode is newer

		inodes_remaining--;
		console.log("Inode " + selected_inode.fingerprint + " processed, " + inodes_remaining + " inodes remaining");
	}
}

