"use strict";
/* globals require */

/// jsfs - Javascript filesystem with a REST interface

// *** CONVENTIONS ***
// strings are double-quoted, variables use underscores, constants are ALL CAPS

// *** UTILITIES  & MODULES ***
var http       = require("http");
var crypto     = require("crypto");
var path       = require("path");
var zlib       = require("zlib");
var through    = require("through");
var config     = require("./config.js");
var log        = require("./jlog.js");
var CONSTANTS  = require("./lib/constants.js");
var utils      = require("./lib/utils.js");
var validate   = require("./lib/validate.js");
var operations = require("./lib/" + (config.CONFIGURED_STORAGE || "fs") + "/disk-operations.js");

// base storage object
var Inode = require("./lib/inode.js");

// get this now, rather than at several other points
var TOTAL_LOCATIONS = config.STORAGE_LOCATIONS.length;

// all responses include these headers to support cross-domain requests
var ALLOWED_METHODS = CONSTANTS.ALLOWED_METHODS.join(",");
var ALLOWED_HEADERS = CONSTANTS.ALLOWED_HEADERS.join(",");
var EXPOSED_HEADERS = CONSTANTS.EXPOSED_HEADERS.join(",");
var ACCEPTED_PARAMS = CONSTANTS.ACCEPTED_PARAMS;

// *** CONFIGURATION ***
log.level = config.LOG_LEVEL; // the minimum level of log messages to record: 0 = info, 1 = warn, 2 = error
log.message(log.INFO, "JSFS ready to process requests");

// at the highest level, jsfs is an HTTP server that accepts GET, POST, PUT, DELETE and OPTIONS methods
http.createServer(function(req, res){

  // override default 2 minute time-out
  res.setTimeout(config.REQUEST_TIMEOUT * 60 * 1000);

  log.message(log.DEBUG, "Initial request received");

  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", EXPOSED_HEADERS);

  // all requests are interrorgated for these values
  var target_url = utils.target_from_url(req.headers["host"], req.url);

  // check for request parameters, first in the header and then in the querystring
  // Moved these to an object to avoid possible issues from "private" being a reserved word
  // (for future use) and to avoid jslint errors from unimplemented param handlers.
  var params = utils.request_parameters(ACCEPTED_PARAMS, req.url, req.headers);

  log.message(log.INFO, "Received " + req.method + " request for URL " + target_url);

  // load requested inode
  switch(req.method){

    case "GET":
      utils.load_inode(target_url, function(err, inode){
        if (err) {
          log.message(log.WARN, "Result: 404");
          res.statusCode = 404;
          return res.end();
        }

        var requested_file = inode;

        // check authorization
        if (inode.private){
          if (validate.is_authorized(inode, req.method, params)) {
            log.message(log.INFO, "GET request authorized");
          } else {
            log.message(log.WARN, "GET request unauthorized");
            res.statusCode = 401;
            return res.end();
          }
        }

        var create_decryptor = function create_decryptor(options){
          return options.encrypted ? crypto.createDecipher("aes-256-cbc", options.key) : through();
        };

        var create_unzipper = function create_unzipper(compressed){
          return compressed ? zlib.createGunzip() : through();
        };

        // return status
        res.statusCode = 200;

        // return file metadata as HTTP headers
        res.setHeader("Content-Type", requested_file.content_type);
        res.setHeader("Content-Length", requested_file.file_size);

        var total_blocks = requested_file.blocks.length;
        var idx = 0;

        var search_for_block = function search_for_block(_idx){
          var location = config.STORAGE_LOCATIONS[_idx];
          var search_path = path.join(location.path, requested_file.blocks[idx].block_hash);
          _idx++;

          operations.exists(search_path + "gz", function(err, result){
            if (result) {
              log.message(log.INFO, "Found compressed block " + requested_file.blocks[idx].block_hash + ".gz in " + location.path);
              requested_file.blocks[idx].last_seen = location.path;
              utils.save_inode(requested_file, function(){
                return read_file(search_path + ".gz", true);
              });
            } else {
              operations.exists(search_path, function(_err, _result){
                if (_result) {
                  log.message(log.INFO, "Found block " + requested_file.blocks[idx].block_hash + " in " + location.path);
                  requested_file.blocks[idx].last_seen = location.path;
                  utils.save_inode(requested_file, function(){
                    return read_file(search_path, false);
                  });

                } else {
                  if (_idx === TOTAL_LOCATIONS) {
                    // we get here if we didn't find the block
                    log.message(log.ERROR, "Unable to locate block in any storage location");
                    res.statusCode = 500;
                    return res.end("Unable to return file, missing blocks");
                  } else {
                    return search_for_block(_idx);
                  }
                }
              });
            }
          });
        };

        var read_file = function read_file(path, try_compressed){
          var read_stream = operations.stream_read(path);
          var decryptor   = create_decryptor({ encrypted : requested_file.encrypted, key : requested_file.access_key});
          var unzipper    = create_unzipper(try_compressed);
          var should_end  = (idx + 1) === total_blocks;

          function on_error(){
            if (try_compressed) {
              log.message(log.WARN, "Cannot locate compressed block in last_seen location, trying uncompressed");
              return load_from_last_seen(false);
            } else {
              log.message(log.WARN, "Did not find block in expected location. Searching...");
              return search_for_block(0);
            }
          }

          function on_end(){
            idx++;
            read_stream.removeListener("end", on_end);
            read_stream.removeListener("error", on_error);
            if (res.getMaxListeners !== undefined) {
              res.setMaxListeners(res.getMaxListeners() - 1);
            }
            send_blocks();
          }

          if (res.getMaxListeners !== undefined) {
            res.setMaxListeners(res.getMaxListeners() + 1);
          } else {
            res.setMaxListeners(0);
          }
          read_stream.on("end", on_end);
          read_stream.on("error", on_error);
          read_stream.pipe(unzipper).pipe(decryptor).pipe(res, {end: should_end});
        };

        var load_from_last_seen = function load_from_last_seen(try_compressed){
          var sfx = try_compressed ? ".gz" : "";
          var block = requested_file.blocks[idx];
          var block_filename = block.last_seen + block.block_hash + sfx;
          read_file(block_filename, try_compressed);
        };

        var send_blocks = function send_blocks(){

          if (idx === total_blocks) { // we're done
            return;
          } else {
            if (requested_file.blocks[idx].last_seen) {
              load_from_last_seen(true);
            } else {
              search_for_block(0);
            }
          }
        };

        send_blocks();

      });

      break;

    case "POST":
    case "PUT":
      // check if a file exists at this url
      log.message(log.DEBUG, "Begin checking for existing file");
      utils.load_inode(target_url, function(err, inode){

        if (inode){

          // check authorization
          if (validate.is_authorized(inode, req.method, params)){
            log.message(log.INFO, "File update request authorized");
          } else {
            log.message(log.WARN, "File update request unauthorized");
            res.statusCode = 401;
            res.end();
            return;
          }
        } else {
          log.message(log.DEBUG, "No existing file found, storing new file");
        }

        // store the posted data at the specified URL
        var new_file = Object.create(Inode);
        new_file.init(target_url);
        log.message(log.DEBUG, "New file object created");

        // set additional file properties (content-type, etc.)
        if(params.content_type){
          log.message(log.INFO, "Content-Type: " + params.content_type);
          new_file.file_metadata.content_type = params.content_type;
        }
        if(params.private){
          new_file.file_metadata.private = true;
        }
        if(params.encrypted){
          new_file.file_metadata.encrypted = true;
        }

        // if access_key is supplied with update, replace the default one
        if(params.access_key){
          new_file.file_metadata.access_key = params.access_key;
        }
        log.message(log.INFO, "File properties set");

        req.on("data", function(chunk){
          new_file.write(chunk, req, function(result){
            if (!result) {
              log.message(log.ERROR, "Error writing data to storage object");
              res.statusCode = 500;
              res.end();
            }
          });
        });

        req.on("end", function(){
          log.message(log.INFO, "End of request");
          if(new_file){
            log.message(log.DEBUG, "Closing new file");
            new_file.close(function(result){
              if(result){
                res.end(JSON.stringify(result));
              } else {
                log.message(log.ERROR, "Error closing storage object");
                res.statusCode = 500;
                res.end();
              }
            });
          }
        });

      });

      break;

    case "DELETE":

      // remove the data stored at the specified URL
      utils.load_inode(target_url, function(error, inode){

        if (error) {
          log.message(log.WARN, "Error loading inode: " + error.toString());
        }

        if(inode){

          // authorize (only keyholder can delete)
          if(validate.has_key(inode, params)){

            // delete inode file
            log.message(log.INFO, "Delete request authorized");

            var remove_inode = function remove_inode(idx){
              var location = config.STORAGE_LOCATIONS[idx];
              var file     = path.join(location.path, inode.fingerprint + ".json");

              operations.delete(file, function(err){
                idx++;
                if (err) {
                  log.message(log.WARN, "Inode " + inode.fingerprint + " doesn't exist in location " + location.path);
                }

                if (idx === TOTAL_LOCATIONS) {
                  res.statusCode = 204;
                  return res.end();
                } else {
                  remove_inode(idx);
                }

              });

            };

            remove_inode(0);

          } else {
            log.message(log.WARN, "Delete request unauthorized");
            res.statusCode = 401;
            res.end();
          }
        } else {
          log.message(log.WARN, "Delete request file not found");
          res.statusCode = 404;
          res.end();
        }
      });

      break;

    case "HEAD":
      utils.load_inode(target_url, function(error, requested_file){
        if (error) {
          log.message(log.WARN, "Error loading inode: " + error.toString());
        }

        if(requested_file){

          // construct headers
          res.setHeader("Content-Type", requested_file.content_type);
          res.setHeader("Content-Length", requested_file.file_size);

          // add extended object headers if we have them
          if(requested_file.media_type){
            res.setHeader("X-Media-Type", requested_file.media_type);
            if(requested_file.media_type !== "unknown"){
              res.setHeader("X-Media-Size", requested_file.media_size);
              res.setHeader("X-Media-Channels", requested_file.media_channels);
              res.setHeader("X-Media-Bitrate", requested_file.media_bitrate);
              res.setHeader("X-Media-Resolution", requested_file.media_resolution);
              res.setHeader("X-Media-Duration", requested_file.media_duration);
            }
          }
          return res.end();
        } else {
          log.message(log.INFO, "HEAD Result: 404");
          res.statusCode = 404;
          return res.end();
        }
      });

      break;

    case "OPTIONS":
      // support for OPTIONS is required to support cross-domain requests (CORS)
      res.writeHead(204);
      res.end();
      break;

    default:
      res.writeHead(405);
      res.end("method " + req.method + " is not supported");
  }

}).listen(config.SERVER_PORT);
