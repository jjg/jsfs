const config = require('../../config.js');
const log = require('../../jlog.js');
// var aws_api    = require("aws-sdk")(config.LINODE_OBJECT_STORAGE.AUTHENTICATION);
const aws_api = require('aws-sdk');
const bucket = config.LINODE_OBJECT_STORAGE.BUCKET;
const aws_s3_endpoint = new aws_api.Endpoint(
  config.LINODE_OBJECT_STORAGE.ENDPOINT
);
const los = new aws_api.S3({
  endpoint: aws_s3_endpoint,
  accessKeyId: config.LINODE_OBJECT_STORAGE.AUTHENTICATION.ACCESS_KEY_ID,
  secretAccessKey:
    config.LINODE_OBJECT_STORAGE.AUTHENTICATION.SECRET_ACCESS_KEY,
});

// *** CONFIGURATION ***
log.level = config.LOG_LEVEL; // the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error
log.message(log.INFO, 'Disk Operation - linode-object-storage - Linode Object Storage');

los.listBuckets(function (err, data) {
  if (err) {
    log.message(log.DEBUG, 'Error ' + err);
  } else {
    log.message(log.DEBUG, 'Success ' + JSON.stringify(data));
  }
});

module.exports.exists = function exists(filePath, callback) {

  log.message(log.DEBUG, "JJG: Got exists()");
  
  return los.headObject({ Bucket: bucket, Key: filePath }, callback);
}

module.exports.read = function read(filePath, callback) {
  return los.getObject(
    { Bucket: bucket, Key: filePath },
    function (err, data) {
      if (err) {
        return callback(err);
      }

      return callback(undefined, data.Body.toString('utf-8'));
    }
  );
}

module.exports.stream_read = function streamRead(filePath) {
  return los.getObject({ Bucket: bucket, Key: filePath }).createReadStream();
}

// write parallels Node's writeFile, which has an optional 3rd parameter:
// https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_writefile_file_data_options_callback
// The final argument (3rd or 4th) is the callback.
module.exports.write = function writeFile(...args) {
  const [filePath, contents, ...restArgs] = args;
  let [contentType, callback] = restArgs;

  // JJG DEBUG
  log.message(log.DEBUG, "JJG: Got write");
  log.message(log.DEBUG, "JJG: filePath: " + filePath);
  
  if (typeof contentType === 'function' && !callback) {

    log.message(log.DEBUG, "JJG: contentType function thing")
    
    callback = contentType;
    contentType = undefined;
  }

  if (!contentType && typeof contents === 'string') {

    log.message(log.DEBUG, "JJG: other contentType thing");
    
    contentType = 'text/plain';
  }

  return los.putObject(
    {
      Bucket: bucket,
      Key: filePath,
      Body: contents,
      ContentType: contentType,
    },
    callback
  );
};

module.exports.delete = function deleteFile(filePath, callback) {
  return los.deleteObject({ Bucket: bucket, Key: filePath }, callback);
};

function isItWorking(pathName, contents) {
  log.message(log.DEBUG, `Starting test: ${pathName}`);
  log.message(log.DEBUG, 'TRY PUT');

  module.exports.write(pathName, contents, function (putErr, putResult) {
    if (putErr) {
      return log.message(log.ERROR, `PUT ERROR: ${putErr}`);
    }

    log.message(log.DEBUG, `PUT RESULT: ${putResult}`);
    log.message(log.DEBUG, 'TRY HEAD');

    module.exports.exists(pathName, function (headErr, headResult) {
      if (headErr) {
        return log.message(log.ERROR, `HEAD ERROR: ${headErr}`);
      }

      log.message(log.DEBUG, `HEAD RESULT: ${headResult}`);
      log.message(log.DEBUG, 'TRY GET');

      module.exports.read(pathName, function (getErr, getResult) {
        if (getErr) {
          return log.message(log.ERROR, `GET ERROR: ${getErr}`);
        }

        log.message(log.DEBUG, `GET RESULT: ${getResult}`);
        log.message(log.DEBUG, 'TRY DELETE');

        module.exports.delete(pathName, function (deleteErr, deleteResult) {
          if (deleteErr) {
            return log.message(log.ERROR, `DELETE ERROR: ${deleteErr}`);
          }

          log.message(log.DEBUG, `DELETE RESULT: ${deleteResult}`);
          log.message(log.DEBUG, 'tested: ' + pathName);
        });
      });
    });
  });
}

isItWorking('startup_test.txt', 'I am a little teapot')
