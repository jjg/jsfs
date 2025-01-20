var fs         = require("fs");
var expect     = require('chai').expect
var file_types = require("../lib/file-types.js");
var config     = require("../config.js");

var BLOCK_SIZE = config.BLOCK_SIZE;

var WAVE_RESULT = {
  bitrate         : 44100,
  channels        : 2,
  data_block_size : 4,
  duration        : 302.26666666666665,
  resolution      : 16,
  size            : 53319876,
  subchunk_byte   : 36,
  subchunk_id     : "data",
  type            : "wave"
};

var UNKNOWN_RESULT = { type: "unknown" };

function load_test_block(file, callback) {
  fs.readFile(file, function(err, data){
    if (err) {
      return callback(err);
    }

    return callback(null, data.slice(0, BLOCK_SIZE));
  });
}

describe("file-types.js", function() {

  describe("#analyze", function() {

    it("should return full result for wave files", function(done) {
      load_test_block("./test/fixtures/test.wav", function(error, block){
        if (error) {
          done(error);
        } else {
          var result = file_types.analyze(block);
          expect(result).to.be.an("object");
          expect(result).to.deep.equal(WAVE_RESULT);
          expect(result).to.have.all.keys(Object.keys(WAVE_RESULT));
          done();
        }
      });
    });

    it("should return `{ type: \"unknown\" }` for mp3 (anything not wave)", function(done) {
      load_test_block("./test/fixtures/test.mp3", function(error, block){
        if (error) {
          done(error);
        } else {
          var result = file_types.analyze(block);
          expect(result).to.be.an("object");
          expect(result).to.deep.equal(UNKNOWN_RESULT);
          expect(result).to.have.all.keys("type");
          done();
        }
      });
    });
  });

});
