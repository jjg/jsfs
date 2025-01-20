"use strict";
/* globals module */

/**

  Lookup WAVE format by chunk size.
  Chunk size of 16 === PCM (1)

  Chunk size of 40 === WAVE_FORMAT_EXTENSIBLE (65534)
    The WAVE_FORMAT_EXTENSIBLE format should be used whenever:
      PCM data has more than 16 bits/sample.
      The number of channels is more than 2.
      The actual number of bits/sample is not equal to the container size.
      The mapping from channels to speakers needs to be specified.
    We should probably do more finer-grained analysis of this format for determining duration,
    by examining any fact chunk between the fmt chunk and the data,but this should be enough for
    current use cases.

  Chunk size of 18 === non-PCM (3, 6, or 7)
    This could be IEEE float (3), 8-bit ITU-T G.711 A-law (6), 8-bit ITU-T G.711 µ-law (7),
    all of which probably require different calculations for duration and are not implemented

  Further reading: http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html

 */

var WAVE_FMTS = {
  16 : 1,
  40 : 65534
};

function format_from_block(block){
  if (is_wave(block)) {
    return "wave";
  } else {
    return "unknown";
  }
}

function is_wave(block){
  return block.toString("utf8", 0, 4) === "RIFF" &&
         block.toString("utf8", 8, 12) === "WAVE" &&
         WAVE_FMTS[block.readUInt32LE(16)] == block.readUInt16LE(20);
}

var _analyze_type = {
  wave: function(block, result){

    var subchunk_byte = 36;
    var subchunk_id   = block.toString("utf8", subchunk_byte, subchunk_byte+4);
    var block_length  = block.length;

    while (subchunk_id !== 'data' && subchunk_byte < block_length) {
      // update start byte for subchunk by adding
      // the size of the subchunk + 8 for the id and size bytes (4 each)
      subchunk_byte = subchunk_byte + block.readUInt32LE(subchunk_byte+4) + 8;
      subchunk_id = block.toString("utf8", subchunk_byte, subchunk_byte+4);
    }

    var subchunk_size   = block.readUInt32LE(subchunk_byte+4);
    var audio_data_size = subchunk_id === 'data' ? subchunk_size : result.size;

    result.type            = "wave";
    result.size            = block.readUInt32LE(4);
    result.channels        = block.readUInt16LE(22);
    result.bitrate         = block.readUInt32LE(24);
    result.resolution      = block.readUInt16LE(34);
    result.subchunk_id     = subchunk_id;
    result.subchunk_byte   = subchunk_byte;
    result.data_block_size = block.readUInt16LE(32);
    result.duration        = (audio_data_size * 8) / (result.channels * result.resolution * result.bitrate);

    return result;

  },

  unknown: function(block, result){
    return result;
  }
};

// examine the contents of a block to generate metadata
module.exports.analyze = function(block){
  var result = { type: format_from_block(block) };

  return _analyze_type[result.type](block, result);

};
