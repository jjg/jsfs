"use strict";
/* globals require, module */

var crypto     = require("crypto");
var path       = require("path");
var url        = require("url");
var log        = require("../jlog.js");
var config     = require("../config.js");
var operations = require("./" + (config.CONFIGURED_STORAGE || "fs") + "/disk-operations.js");

var TOTAL_LOCATIONS = config.STORAGE_LOCATIONS.length;

// simple encrypt-decrypt functions
module.exports.encrypt = function encrypt(data, key){
  var cipher = crypto.createCipher("aes-256-cbc", key);
  cipher.write(data);
  cipher.end();
  return cipher.read();
};

var sha1_to_hex = function sha1_to_hex(data){
  var shasum = crypto.createHash("sha1");
  shasum.update(data);
  return shasum.digest("hex");
};
module.exports.sha1_to_hex = sha1_to_hex;

// save inode to disk
module.exports.save_inode = function save_inode(inode, callback){
  var accessed_locations = 0;

  var _cb = function _cb(error){
    accessed_locations++;
    if(error){
      log.message(log.ERROR, "Error saving inode: " + error);
    } else {
      log.message(log.INFO, "Inode saved to disk");
    }
    if (accessed_locations === TOTAL_LOCATIONS) {
      return callback(inode);
    }
  };

  // store a copy of each inode in each storage location for redundancy
  for(var storage_location in config.STORAGE_LOCATIONS){
    var selected_location = config.STORAGE_LOCATIONS[storage_location];
    operations.write(path.join(selected_location.path, inode.fingerprint + ".json"), JSON.stringify(inode), _cb);
  }
};

// load inode from disk
module.exports.load_inode = function load_inode(uri, callback){
  log.message(log.DEBUG, "uri: " + uri);

  // calculate fingerprint
  var inode_fingerprint = sha1_to_hex(uri);

  var _load_inode = function _load_inode(idx){
    var selected_path = config.STORAGE_LOCATIONS[idx].path;
    log.message(log.DEBUG, "Loading inode from " + selected_path);

    operations.read(path.join(selected_path, inode_fingerprint + ".json"), function(err, data){
      idx++;
      if (err) {
        if (idx === TOTAL_LOCATIONS) {
          log.message(log.WARN, "Unable to load inode for requested URL: " + uri);
          return callback(err);
        } else {
          log.message(log.DEBUG, "Error loading inode from " + selected_path);
          return _load_inode(idx);
        }
      }

      try {
        var inode = JSON.parse(data);
        log.message(log.INFO, "Inode loaded from " + selected_path);
        return callback(null, inode);
      } catch(ex) {
        if (idx === TOTAL_LOCATIONS) {
          log.message(log.WARN, "Unable to parse inode for requested URL: " + uri);
          return callback(ex);
        } else {
          log.message(log.DEBUG, "Error parsing inode from " + selected_path);
          return _load_inode(idx);
        }
      }
    });
  };

  _load_inode(0);
};

module.exports.commit_block_to_disk = function commit_block_to_disk(block, block_object, next_storage_location, callback) {
  // if storage locations exist, save the block to disk
  var total_locations = config.STORAGE_LOCATIONS.length;

  if(total_locations > 0){

    // check all storage locations to see if we already have this block

    var on_complete = function on_complete(found_block){
      // TODO: consider increasing found count to enable block redundancy
      if(!found_block){

        // write new block to next storage location
        // TODO: consider implementing in-band compression here
        var dir = config.STORAGE_LOCATIONS[next_storage_location].path;
        operations.write(path.join(dir, block_object.block_hash), block, "binary", function(err){
          if (err) {
            return callback(err);
          }

          block_object.last_seen = dir;
          log.message(log.INFO, "New block " + block_object.block_hash + " written to " + dir);

          return callback(null, block_object);

        });

      } else {
        log.message(log.INFO, "Duplicate block " + block_object.block_hash + " not written to disk");
        return callback(null, block_object);
      }
    };

    var locate_block = function locate_block(idx){
      var location = config.STORAGE_LOCATIONS[idx];
      var file = path.join(location.path, block_object.block_hash);
      idx++;

      operations.exists(file + ".gz", function(err, result){

        if (result) {
          log.message(log.INFO, "Duplicate compressed block " + block_object.block_hash + " found in " + location.path);
          block_object.last_seen = location.path;
          return on_complete(true);
        } else {
          operations.exists(file, function(err_2, result_2){

            if (err_2) {
              log.message(log.INFO, "Block " + block_object.block_hash + " not found in " + location.path);
            }

            if (result_2) {
              log.message(log.INFO, "Duplicate block " + block_object.block_hash + " found in " + location.path);
              block_object.last_seen = location.path;
              return on_complete(true);
            } else {
              if (idx >= total_locations) {
                return on_complete(false);
              } else {
                locate_block(idx);
              }
            }
          });
        }
      });
    };

    locate_block(0);

  } else {
    log.message(log.WARN, "No storage locations configured, block not written to disk");
    return callback(null, block_object);
  }
};

// Use analyze data to identify offset until non-zero audio, grab just that portion to store.

// In analyze we identified the "data" starting byte and block_align ((Bit Size * Channels) / 8)
// We'll start the scan at block.readUInt32LE([data chunk offset] + 8) in order to find the
// start of non-zero audio data, and slice off everything before that point as a seperate block.
// That way we can deduplicate tracks with slightly different silent leads.
module.exports.wave_audio_offset = function wave_audio_offset(block, data, default_size){
  // block_align most likely to be 4, but it'd be nice to handle alternate cases.
  // Essentially, we should use block["readUInt" + (block_align * 8) + "LE"]() to scan the block.
  var block_align = data.data_block_size;

  if (data.subchunk_id === "data" && block_align === 4) {
     // start of audio subchunk + 4 bytes for the label ("data") + 4 bytes for size)
    var data_offset  = data.subchunk_byte + 4 + 4;
    var block_length = block.length;

    // Increment our offset by block_align, since we're analyzing on the basis of it.
    for (data_offset; (data_offset + block_align) < block_length; data_offset = data_offset + block_align) {
      if (block.readUInt32LE(data_offset) !== 0) {
        log.message(log.INFO, "Storing the first " + data_offset + " bytes seperately");
        // return the offset with first non-zero audio data;
        return data_offset;
      }
    }
    // if we didn't return out of the for loop, return default
    return default_size;

  } else {
    // If we didn't find a data chunk, return default
    return default_size;
  }
};

function dasherize(s){
  return s.replace(/_/g, '-');
}

function to_header(param, obj){
  var prefix = obj[param];
  return (prefix ? prefix + "-" : "") + dasherize(param);
}

module.exports.request_parameters = function request_parameters(accepted_params, uri, headers){
  var q = url.parse(uri, true).query;

  return accepted_params.reduce(function(o,p){
    var _p = Object.keys(p)[0];
    o[_p] = q[_p] || headers[to_header(_p, p)];
    return o;
  }, {});
};

module.exports.target_from_url = function target_from_url(hostname, uri) {
  var parsed = url.parse(uri);
  var pathname = parsed.pathname;
  hostname = hostname.split(":")[0];

  if (pathname.substring(0,2) !== "/.") {
    return "/" + hostname.split(".").reverse().join(".") + pathname;
  } else {
    return "/" + pathname.substring(2);
  }
};
