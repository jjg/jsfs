"use strict";
/* globals require, module */

/**

  To use google-cloud-storage, you'll need to install it's dependency:

  `npm install --save @google-cloud/storage`

  and update config.js with additional parameters:

  CONFIGURED_STORAGE: "google-cloud-storage",
  GOOGLE_CLOUD_STORAGE: {
    BUCKET: "your-bucket-name",
    AUTHENTICATION: {
      projectId: 'your-project-123',
      keyFilename: '/path/to/keyfile.json'
    }
  }

  If you are running on a Google Compute Engine VM, you do not need to
  include AUTHENTICATION (eg. `config.GOOGLE_CLOUD_STORAGE.AUTHENTICATION`
  should return `undefined`).

  You will also need to be sure that the authenticated account has "full"
  permissions to the Storage API:
  https://cloud.google.com/storage/docs/access-control/iam

  Further information at
  https://github.com/GoogleCloudPlatform/google-cloud-node#google-cloud-storage-beta

  JSFS neither endorses nor is endorsed by Google.

**/

var config = require("../../config.js");
var gcs    = require("@google-cloud/storage")(config.GOOGLE_CLOUD_STORAGE.AUTHENTICATION);
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
