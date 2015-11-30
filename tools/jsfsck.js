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
var config_path = null
var mode = null;

// TODO: parse command line parameters
config_path = process.argv[2];
mode = process.argv[3];

if(!config_path || !mode){
  console.log("usage: node jsfsck.js <path to config.js> <mode>");
  process.exit(0);
}

// TODO: load configuration


// TODO: iterate over blocks and create uniquie block index

// TODO: count blocks in each storage location

// TODO: count inodes in each storage location

// TODO: examine each inode

// TODO: stat each block referenced in the inode


// TODO: update last_seen property for each block if found
