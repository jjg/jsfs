// globals
var fs = require("fs");
var config_path = null
var stored_bytes = 0;

// parse command line parameters
config_path = process.argv[2];

if(!config_path){
  console.log("usage: node pool_size.js <path to config.js>");
  process.exit(0);
}

// load configuration
var config = null;
try{
  config = require(config_path);
  if(config.STORAGE_LOCATIONS.length < 1){
    console.log("No storage locations configured, exiting");
    process.exit(0);
  }
} catch(exception) {
  console.log("Error reading configuration: " + exception);
}


// load inode index from primary storage location
var files = fs.readdirSync(config.STORAGE_LOCATIONS[0].path);
for(file in files){
  var selected_file = files[file];
  if(selected_file.indexOf(".json") > -1){
  
    // parse inode
    try{
      var inode = JSON.parse(fs.readFileSync(config.STORAGE_LOCATIONS[0].path + selected_file));
      stored_bytes += inode.file_size;
      console.log("Bytes stored: " + stored_bytes);
    } catch (exception) {
      console.log("Error parsing inode: " + exception);
    }
  }
}

console.log("Processing complete");
