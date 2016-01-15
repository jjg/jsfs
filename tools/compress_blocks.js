var fs = require("fs");
var zlib = require("zlib");

var files = fs.readdirSync(process.argv[2]);

console.log("Processing " + files.length + " blocks");

for(file in files){
  var selected_file = files[file];
  if(selected_file.indexOf(".gz") < 0 && selected_file.indexOf(".json") < 0){
    console.log("compressing " + selected_file);
    fs.writeFileSync(selected_file + ".gz", zlib.gzipSync(fs.readFileSync(selected_file)));
    
    // TODO: delete uncompressed block
    fs.unlink(selected_file);
  }
}
