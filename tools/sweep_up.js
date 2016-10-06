"use strict";
/* globals require, console, process */

var SOURCE_PORT = process.env.SOURCE_PORT || '7302';
var ENV         = process.env.ENV || 'development';

var http       = require('http');
var url        = require('url');
var fs         = require('fs');
var log        = require('../jlog.js');
var SOURCE_IPS = require('./source_ips.js');
var timer      = require('./timer.js');
var tracks     = [];
var errors     = [];
var JSFS_HOST  = ENV === 'development' ? 'localhost' : '10.240.0.18';
var JSFS_PORT  = '7302';
var ERROR_FILE = process.env.ERROR_FILE;

if (!ERROR_FILE) {
  process.exit(9);
}

process.on('beforeExit', function(){
  console.log('process.beforeExit:', arguments, tracks.length, 'tracks remaining');
});

process.on('exit', function(code){
  log.message(log.DEBUG ,'About to exit with code: ' + code);
});

process.on('uncaughtException', function(err){
  console.log("Caught exception: ", err);
  console.trace(err);
  console.log(err.stack);
});

process.on('unhandledRejection', function(reason, p){
  console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
  process.exit(1);
});

log.message(log.INFO, '******* MIGRATING ERRORED FILES FROM ' + ERROR_FILE + ' ********');

var clock = timer('JSFS error sweep');

function namespacedPath(url_parts){
  var path = url_parts.path;
  if (path.indexOf('/.') === 0) {
    return path;
  } else {
    return '/.' +url_parts.hostname.split('.').reverse().join('.') + path;
  }
}

function logError(e, s){
  s = s || '';
  var message = e.message || e.toString();
  log.message(log.ERROR, s + message);
}

function moveFile(file_url){
  var path_parts = url.parse(file_url);
  var path      = namespacedPath(path_parts);
  var source_ip = ENV === 'development' ? path_parts.hostname : SOURCE_IPS[path_parts.hostname];

  if (!source_ip) {
    log.message(log.ERROR, 'NO CONFIGURED IP FOR SOURCE: ' + path_parts.hostname + '. ABORTING.');
    process.exit();
  }

  var fetch_options = {
    hostname : source_ip,
    port     : SOURCE_PORT,
    path     : path,
    agent    : false
  };

  var store_options = {
    hostname : JSFS_HOST,
    port     : JSFS_PORT,
    method   : 'POST',
    path     : path,
    headers  : {
      'Content-Type' : 'application/octet-stream',
      'X-Private'    : true
    }
  };

  log.message(log.INFO, 'Moving ' + file_url + ' to ' + JSFS_HOST + store_options.path);

  /*******

    If no 'response' handler is added, then the response will be entirely discarded.
    However, if you add a 'response' event handler, then you must consume the data
    from the response object, either by calling response.read() whenever there is a
    'readable' event, or by adding a 'data' handler, or by calling the .resume() method.
     Until the data is consumed, the 'end' event will not fire. Also, until the data is
     read it will consume memory that can eventually lead to a 'process out of memory' error.

  */

    /***

    Order of events messages:
    fetch_request.on('finish')
    store_request.on('finish')
    fetch_request.on('close');
    store_request.on('close');
    fetch_response.on('close');

   **/

  // console.log(fetch_options);
  // console.log(store_options);

  var store_request = http.request(store_options).on('error', function(e){
    console.log('store request error', e);
  });

  http.get(fetch_options, function(fetch_response){

    fetch_response.pipe(store_request, {end: true})
                  .on('close', function(){
                    log.message(log.INFO, 'File stored to ' + JSFS_HOST + store_options.path);
                    log.message(log.DEBUG, tracks.length +' tracks remaining');
                    store_request.end();
                    moveNextFile();
                  }).on('error', function(e){
                    console.error(e);
                    console.error(e.stack);
                    logError(e, 'ERROR: fetch response error for track ' + file_url + ': ');
                    errors.push(file_url);
                  });
  }).on('error', function(e){
    logError(e, 'ERROR: fetch request error for track ' + file_url + ': ');
    errors.push(file_url);
  });

  fetch.end();

  // var store_request = http.request(store_options);

  // http.get(fetch_options, function(fetch_response){
  //   fetch_response.pipe(store_request, {end: true})
  //                 .on('close', function(){
  //                   log.message(log.INFO, 'File stored to ' + JSFS_HOST + store_options.path);
  //                   log.message(log.DEBUG, tracks.length +' tracks remaining');
  //                   store_request.end();
  //                   return moveNextFile();
  //                 }).on('error', function(e){
  //                   logError(e, 'ERROR: fetch response error for track ' + file_url + ': ');
  //                   console.log(e);
  //                   errors.push(file_url);
  //                 });
  // }).on('error', function(e){
  //   logError(e, 'ERROR: fetch request response error for track ' + file_url + ': ');
  //   errors.push(file_url);
  // });

  // var storage_request = http.request(store_options, function(s_res){
  //   log.message(log.DEBUG, 'got response from storage request');
  //   var data = '';

  //   s_res.on('data', function(chunk){
  //     data += chunk.toString();
  //   });

  //   s_res.on('error', function(e){
  //     logError(e, 'ERROR: storage response error for track ' + file_url + ': ');
  //     errors.push(file_url);
  //   });

  //   s_res.on('aborted', function(){
  //     log.message(log.INFO, 'ABORTED event triggered on storage response');
  //   });

  //   s_res.on('close', function(){
  //     log.message(log.INFO, 'CLOSE event triggered on storage response');
  //     log.message(log.INFO, data);
  //   });

  // }).on('error', function(e){
  //   logError(e, 'ERROR: storage request error for track ' + file_url + ': ');
  //   errors.push(file_url);
  // }).on('connect', function(){
  //   console.log('connected to storage server');
  // });

  // http.get(fetch_options, function(f_res){
  //   log.message(log.DEBUG, 'made fetch request');

  //   f_res.on('data', function(chunk){
  //     storage_request.write(chunk);
  //   });

  //   f_res.on('close', function(){
  //     log.message(log.INFO, 'File stored to ' + JSFS_HOST + store_options.path);
  //     log.message(log.DEBUG, tracks.length +' tracks remaining');
  //     storage_request.end(/*moveNextFile*/);
  //   });

  //   f_res.on('error', function(e){
  //     logError(e, 'ERROR: fetch response error for track ' + file_url + ': ');
  //     errors.push(file_url);
  //   });

  //   f_res.on('end', function(){
  //     console.log('No more data in response.');
  //   });

  // }).on('error', function(e){
  //   logError(e, 'ERROR: fetch request error for track ' + file_url + ': ');
  //   errors.push(file_url);
  // });
}

function moveNextFile(){
  if (tracks.length > 0) {
    var line = tracks.shift();
    var url = line.match(/(?:http:\/\/|https:\/\/).+?(?=:\s)/);
    if (url && url[0]) {
      moveFile(url[0]);
    } else {
      log.message(log.INFO, 'no url found in "' + line + '"');
      moveNextFile();
    }
  } else {
    log.message(log.INFO, '******** ' + ERROR_FILE + ' SWEEP COMPLETED *********');
    clock.stop();
    log.message(log.ERROR, 'The following files experienced errors: ' + JSON.stringify(errors));
  }
}

fs.readFile(ERROR_FILE, 'utf8', function(err, data){
  if(err){
    log.message(log.ERROR, err.toString());
    process.abort();
  }

  tracks = tracks.concat(data.split('\n'));
  moveNextFile();
});
