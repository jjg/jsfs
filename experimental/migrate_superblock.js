var fs = require("fs");
var crypto = require("crypto");

// open superblock file
console.log("Loading superblock...");
var superblock = JSON.parse(fs.readFileSync("superblock.json"));
console.log("Superblock loaded, indexing inodes...");
var inodes_total = 0;
for(inode in superblock){
	if(superblock.hasOwnProperty(inode)){
		inodes_total++;
	}
}
var inodes_remaining = inodes_total;
console.log("Superblock indexed, " + inodes_remaining + " inodes to process");

// load next inode
for(inode in superblock){
	if(superblock.hasOwnProperty(inode)){
		var selected_inode = superblock[inode];

		// generate inode filename
		var shasum = crypto.createHash("sha1");
		shasum.update(selected_inode.url);
		var inode_filename = shasum.digest("hex") + ".json";
		log("Inode filename: " + inode_filename);

		// check if inode file exists
		try{
			// if inode file exists, load existing file
			var existing_inode = JSON.parse(fs.readFileSync(inode_filename));
			log("Inode file already exists, comparing versions...");
			// compare versions
			if(inode.version > existing_inode.version){
				// replace existing file if the current inode is newer
				log("Replacing existing inode file with newer version");
				fs.writeFileSync(inode_filename, JSON.stringify(selected_inode));
			}
		}catch(ex){
			// if inode doesn't exist, save the one we have
			log("Writing inode file to disk");
			fs.writeFileSync(inode_filename, JSON.stringify(selected_inode));
		}

		inodes_remaining--;
		log("Inode " + selected_inode.fingerprint + " processed, " + inodes_remaining + " inodes remaining");
	}
}

console.log("Superblock migration complete!");

function log(message){
	console.log(inodes_total + "/" + inodes_remaining + " - " + message);
}

