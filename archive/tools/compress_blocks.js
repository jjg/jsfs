var fs = require("fs");
var zlib = require("zlib");
var files;
var block_location;
var total;

var process_next_file = function process_next_file(){
  console.log((((total - files.length) / total) * 100) + "% completed");

  if (files.length > 0) {
    process_file(files.pop());
  } else {
    console.log("No more blocks to compress");
  }
};

var process_file = function process_file(file){
  var selected_file = block_location + "/" + file;

  if(selected_file.indexOf(".gz") < 0 && selected_file.indexOf(".json") < 0){
    var on_finish = function on_finish(){
      writer.removeListener("finish", on_finish);
      fs.unlink(selected_file, function(err){
        if (err) {
          console.log(err);
          return;
        }
        process_next_file();
      });
    };

    var writer = fs.createWriteStream(selected_file + ".gz");
    writer.on("finish", on_finish);
    fs.createReadStream(selected_file).pipe(zlib.createGzip()).pipe(writer);

  } else {
    process_next_file();
  }

};

if(process.argv[2]){

  block_location = process.argv[2]

  fs.readdir(block_location, function(err, _files){
    if (err) {
      console.log(err);
      return;
    }

    files = _files;
    total = files.length;
    process_next_file();
  });
} else {
  console.log("usage: compress_blocks.js <path to blocks>");
}
