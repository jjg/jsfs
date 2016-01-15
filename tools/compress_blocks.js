var fs = require("fs");
var zlib = require("zlib");

if(process.argv[2]){

  var block_location = process.argv[2]
  var files = fs.readdirSync(block_location);

  for(file in files){
    var selected_file = block_location + "/" + files[file];
    if(selected_file.indexOf(".gz") < 0 && selected_file.indexOf(".json") < 0){
    
      console.log(Math.round((file / files.length * 100)) + "% complete");
      
      fs.writeFileSync(selected_file + ".gz", zlib.gzipSync(fs.readFileSync(selected_file)));
      
      // delete uncompressed block
      fs.unlink(selected_file);
    }
  }
  console.log("No more blocks to compress");
} else {
  console.log("usage: compress_blocks.js <path to blocks>");
}
