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
var mode = "i";
var good_inodes = 0;
var bad_inodes = [];
var pool_size_in_bytes = 0;
var on_disk_size_in_bytes = 0;

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


// load inode index from primary storage location
var files = fs.readdirSync(config.STORAGE_LOCATIONS[0].path);
for(file in files){
  var selected_file = files[file];
  if(selected_file.indexOf(".json") > -1){
  
    // parse inode
    try{
      var inode = JSON.parse(fs.readFileSync(config.STORAGE_LOCATIONS[0].path + selected_file));
      
      // test each block
      var missing_blocks = 0;
      for(block in inode.blocks){
        var selected_block = inode.blocks[block];
        
        var block_location = null;
        for(location in config.STORAGE_LOCATIONS){
          var selected_location = config.STORAGE_LOCATIONS[location];
          try{
            var block_stats = fs.statSync(selected_location.path + selected_block.block_hash);
            pool_size_in_bytes += block_stats.size;
            block_location = selected_location.path;
          } catch(ex) {
            // do nothing
            //console.log(ex);
          }
        }
        
        // keep track of missing blocks
        if(block_location){
          //good_inodes.push(selected_file);
        } else {
          missing_blocks++;
          //bad_inodes.push(selected_file);
        }
      }
      
      if(missing_blocks > 0){
        bad_inodes.push(selected_file);
      } else {
        good_inodes++;
      }
    } catch(ex) {
      bad_inodes.push(selected_file);
    }
  } else {
    // do nothing?
  }
}


// calculate total disk useage for pool (includes inode files)
for(location in config.STORAGE_LOCATIONS){
  var selected_location = config.STORAGE_LOCATIONS[location];
  var files = fs.readdirSync(selected_location.path);
  for(file in files){
    var selected_file = files[file];
    var file_stats = fs.statSync(selected_location.path + selected_file);
    on_disk_size_in_bytes += file_stats.size;
  }
}


console.log("config_path: " + config_path);
console.log("mode: " + mode);
console.log("good_inodes: " + good_inodes);
console.log("bad_inodes: " + bad_inodes.length);
console.log("pool_size_in_bytes:" + pool_size_in_bytes);
console.log("on_disk_size_in_bytes: " + on_disk_size_in_bytes);
console.log("deduplication rate: " + (on_disk_size_in_bytes / pool_size_in_bytes)*100 + "%");

var total_files = good_inodes + bad_inodes.length;
var pool_size_in_megabytes = (pool_size_in_bytes / 1024) / 1024;
var on_disk_size_in_megabytes = (on_disk_size_in_bytes / 1024) /1024;
var duplicate_percentage = 100 - ((on_disk_size_in_bytes / pool_size_in_bytes)*100);

console.log(pool_size_in_megabytes + "MB in " + total_files + " files. " + bad_inodes.length + " errors, " + duplicate_percentage + "% duplicate data");





