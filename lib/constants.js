"use strict";
/* globals module */

module.exports.ALLOWED_METHODS = ["GET",
                                  "POST",
                                  "PUT",
                                  "DELETE",
                                  "OPTIONS"];

module.exports.ALLOWED_HEADERS = ["Accept",
                                  "Accept-Version",
                                  "Api-Version",
                                  "Content-Type",
                                  "Origin",
                                  "Range",
                                  "X_FILENAME",
                                  "X-Access-Key",
                                  "X-Access-Token",
                                  "X-Append",
                                  "X-Encrypted",
                                  "X-Private",
                                  "X-Replacement-Access-Key",
                                  "X-Requested-With"];

module.exports.EXPOSED_HEADERS = ["X-Media-Bitrate",
                                  "X-Media-Channels",
                                  "X-Media-Duration",
                                  "X-Media-Resolution",
                                  "X-Media-Size",
                                  "X-Media-Type"];

module.exports.ACCEPTED_PARAMS = [{"access_key": "x"},
                                  {"access_token": "x"},
                                  {"block_only": "x"},
                                  {"content_type": undefined},
                                  {"encrypted": "x"},
                                  {"expires": "x"},
                                  {"inode_only": "x"},
                                  {"private": "x"},
                                  {"replacement_access_key": "x"},
                                  {"version": "x"}];
