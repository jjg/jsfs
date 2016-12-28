"use strict";
/* globals require, module */

var config = require("../../config.js");
var gcs    = require("@google-cloud/storage")(config.GOOGLE_CLOUD_STORAGE.AUTHENTICATION);

// {
//   projectId: 'grape-spaceship-123',
//   keyFilename: '/path/to/keyfile.json'
// }

var bucket = gcs.bucket(config.GOOGLE_CLOUD_STORAGE.BUCKET);

module.exports.read = function(file_path, callback){
  return bucket.file(file_path).download(callback);
};

module.exports.exists = function(file_path, callback){
  return bucket.file(file_path).getMetadata(callback);
};

module.exports.stream_read = function(file_path){
  return bucket.file(file_path).createReadStream();
};

module.exports.write = function(file_path, contents /*[, options], cb */){
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();

  return bucket.file(file_path).save(contents, callback);
};

module.exports.delete = function(file_path, callback){
  return bucket.file(file_path).delete(callback);
};
