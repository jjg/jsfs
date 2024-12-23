"use strict";
/* globals require, module */

var log   = require("../jlog-nomem.js");
var utils = require("./utils.js");

var time_valid = function time_valid(expires){
  return !expires || ( expires >= new Date().getTime() );
};

var expected_token = function expected_token(inode, method, params) {
  var expected_token = utils.sha1_to_hex(inode.access_key + method + (params.expires || ""));

  log.message(log.DEBUG,"expected_token: " + expected_token);
  log.message(log.DEBUG,"access_token: " + params.access_token);

  return expected_token === params.access_token;
};

var token_valid = function token_valid(inode, method, params){
  // don't bother validating tokens for HEAD, OPTIONS requests
  // jjg - 08172015: might make sense to address this by removing the check from
  // the method handlers below, but since I'm not sure if this is
  // permanent, this is cleaner for now

  return !!params.access_token &&
         (( method === "HEAD" || method === "OPTIONS" ) ||
          ( time_valid(params.expires) && expected_token.apply(null, Array.prototype.slice.call(arguments)) ));
};

var has_key = function has_key(inode, params){
  return params.access_key && params.access_key === inode.access_key;
};
module.exports.has_key = has_key;

module.exports.is_authorized = function is_authorized(inode, method, params){
 return has_key(inode, params) ||
        token_valid.apply(null, Array.prototype.slice.call(arguments));
};
