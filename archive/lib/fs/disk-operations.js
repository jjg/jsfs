"use strict";
/* globals require, module */

var fs      = require("fs");

module.exports.exists      = fs.stat;
module.exports.read        = fs.readFile;
module.exports.stream_read = fs.createReadStream;
module.exports.write       = fs.writeFile;
module.exports.delete      = fs.unlink;
