"use strict";
/* globals require, module, Buffer */

var config     = require("../config.js");
var log        = require("../jlog.js");
var utils      = require("./utils.js");
var file_types = require("./file-types.js");

// global to keep track of storage location rotation
var next_storage_location = 0;

var Inode = {
  init: function(url){
    this.input_buffer = new Buffer("");
    this.block_size = config.BLOCK_SIZE;
    this.file_metadata = {};
    this.file_metadata.url = url;
    this.file_metadata.created = (new Date()).getTime();
    this.file_metadata.version = 0;
    this.file_metadata.private = false;
    this.file_metadata.encrypted = false;
    this.file_metadata.fingerprint = null;
    this.file_metadata.access_key = null;
    this.file_metadata.content_type = "application/octet-stream";
    this.file_metadata.file_size = 0;
    this.file_metadata.block_size = this.block_size;
    this.file_metadata.blocks_replicated = 0;
    this.file_metadata.inode_replicated = 0;
    this.file_metadata.blocks = [];

    // create fingerprint to uniquely identify this file
    this.file_metadata.fingerprint = utils.sha1_to_hex(this.file_metadata.url);

    // use fingerprint as default key
    this.file_metadata.access_key = this.file_metadata.fingerprint;
  },
  write: function(chunk, req, callback){
    this.input_buffer = new Buffer.concat([this.input_buffer, chunk]);
    if (this.input_buffer.length > this.block_size) {
      req.pause();
      this.process_buffer(false, function(result){
        req.resume();
        callback(result);
      });
    } else {
      callback(true);
    }
  },
  close: function(callback){
    var self = this;
    log.message(0, "flushing remaining buffer");
    // update original file size
    self.file_metadata.file_size = self.file_metadata.file_size + self.input_buffer.length;

    self.process_buffer(true, function(result){
      if(result){
        // write  inode to disk
        utils.save_inode(self.file_metadata, callback);
      }
    });
  },
  process_buffer: function(flush, callback){
    var self = this;
    var total = flush ? 0 : self.block_size;
    this.store_block(!flush, function(err/*, result*/){
      if (err) {
        log.message(log.DEBUG, "process_buffer result: " + err);
        return callback(false);
      }

      if (self.input_buffer.length > total) {
        self.process_buffer(flush, callback);
      } else {
        callback(true);
      }

    });
  },
  store_block: function(update_file_size, callback){
    var self = this;
    var chunk_size = this.block_size;

    // grab the next block
    var block = this.input_buffer.slice(0, chunk_size);

    if(this.file_metadata.blocks.length === 0){

      // grok known file types
      var analysis_result = file_types.analyze(block);

      log.message(log.INFO, "block analysis result: " + JSON.stringify(analysis_result));

      // if we found out anything useful, annotate the object's metadata
      this.file_metadata.media_type = analysis_result.type;
      if(analysis_result.type != "unknown"){
        this.file_metadata.media_size = analysis_result.size;
        this.file_metadata.media_channels = analysis_result.channels;
        this.file_metadata.media_bitrate = analysis_result.bitrate;
        this.file_metadata.media_resolution = analysis_result.resolution;
        this.file_metadata.media_duration = analysis_result.duration;
      }

      if (analysis_result.type === "wave") {
        chunk_size = utils.wave_audio_offset(block, analysis_result)
        block = block.slice(0, chunk_size);
      }
    }

    // if encryption is set, encrypt using the hash above
    if(this.file_metadata.encrypted && this.file_metadata.access_key){
      log.message(log.INFO, "encrypting block");
      block = utils.encrypt(block, this.file_metadata.access_key);
    } else {

      // if even one block can't be encrypted, say so and stop trying
      this.file_metadata.encrypted = false;
    }

    // store the block
    var block_object = {};

    // generate a hash of the block to use as a handle/filename
    block_object.block_hash = utils.sha1_to_hex(block);

    var retries = config.STORAGE_LOCATIONS.length;
    utils.commit_block_to_disk(block, block_object, next_storage_location, retries, function(err, result){
      if (err) {
        return callback(err);
      }

      // increment (or reset) storage location (striping)
      next_storage_location++;
      if(next_storage_location === config.STORAGE_LOCATIONS.length){
        next_storage_location = 0;
      }

      // update inode
      self.file_metadata.blocks.push(result);

      // update original file size
      // we need to update filesize here due to truncation at the front,
      // but need the check to avoid double setting during flush
      // is there a better way?
      if (update_file_size) {
        self.file_metadata.file_size = self.file_metadata.file_size + chunk_size;
      }

      // advance buffer
      self.input_buffer = self.input_buffer.slice(chunk_size);
      return callback(null, result);
    });
  }
};

module.exports = Inode;
