// jsfsck - check and repair jsfs filesystems
//
// node jsfsck.js <config file location> <options>
// 
// options
// -V verbose
// -y automatically fix any errors encountered without prompting
// -r interactively repair errors (ask before fixing each type of error)
// -b re-balance blocks across configured storage locations
//
// if no repair options are specified, only analysis is performed

// globals
var fs = require("fs");
var config_path = null
var mode = null;
var unique_block_index = [];
var pool_size_in_bytes = 0;
var on_disk_size_in_bytes = 0;
var files_stored = 0;
var errors = [];

// parse command line parameters
config_path = process.argv[2];
mode = process.argv[3];

if(!config_path || !mode){
  console.log("usage: node jsfsck.js <path to config.js> <mode>");
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


for(location in config.STORAGE_LOCATIONS){
  var selected_location = config.STORAGE_LOCATIONS[location];
  
  var files = fs.readdirSync(selected_location.path);
  
  for(file in files){
    var selected_file = files[file];
    if(selected_file.indexOf(".json") > -1){
      files_stored++;
      var inode = JSON.parse(fs.readFileSync(selected_file));

// TODO: iterate over blocks and create uniquie block index

// TODO: count blocks in each storage location

// TODO: count inodes in each storage location

// TODO: examine each inode

// TODO: stat each block referenced in the inode


// TODO: update last_seen property for each block if found
