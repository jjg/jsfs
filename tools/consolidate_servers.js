"use strict";
/* globals require, console */

/***********

  jsfs-g.murfie.com  =====>   10.240.123.180
  jsfs2.murfie.com   =====>   10.240.123.180
  jsfs3.murfie.com   =====>   10.240.0.3
  jsfs4.murfie.com   =====>   10.240.0.5
  jsfs5.murfie.com   =====>   10.240.0.6
  jsfs6.murfie.com   =====>   10.240.0.7
  jsfs7.murfie.com   =====>   10.240.0.8
  jsfs8.murfie.com   =====>   10.240.0.9
  jsfs9.murfie.com   =====>   10.240.0.10
  jsfs10.murfie.com  =====>   10.240.0.11
  jsfs11.murfie.com  =====>   10.240.0.12
  jsfs12.murfie.com  =====>   10.240.0.13
  jsfs13.murfie.com  =====>   10.240.0.14
  jsfs14.murfie.com  =====>   10.240.0.15
  jsfs15.murfie.com  =====>   10.240.0.17
  jsfs16.murfie.com  =====>   10.240.0.19
  jsfs17.murfie.com  =====>   10.240.0.20
  jsfs18.murfie.com  =====>   10.240.0.21
  jsfs19.murfie.com  =====>   10.240.0.23
  jsfs21.murfie.com  =====>   10.240.0.24
  jsfs22.murfie.com  =====>   10.240.0.25

 **/

/*  CONFIGURATION  */
var SOURCE_HOST = 'jsfs4.murfie.com';
var SOURCE_IP   = '10.240.0.5';
var SOURCE_PORT = '7302';
var OFFSET      = 0;

/*  SETUP  */
var http      = require('http');
var url       = require('url');
var query     = require('pg-query');
var tracks    = [];
var JSFS_HOST = '127.0.0.1';
var JSFS_PORT = '7302';

query.connectionParameters = 'postgres://marc:@localhost:5432/murfie_dev';

function namespacedPath(url_parts){
  var path = url_parts.path;
  if (path.indexOf('/.') === 0) {
    return path;
  } else {
    return '/.' +url_parts.hostname.split('.').reverse().join('.') + path;
  }
}

function moveFile(file){
  var path      = namespacedPath(url.parse(file.url));
  var fetch_url = file.url + '?access_key=' + file.access_key;

  var fetch_options = {
    hostname : SOURCE_IP,
    port     : SOURCE_PORT,
    path     : path,
    headers  : {
      'X-Access-Key' : file.access_key
    }
  };

  var store_options = {
    hostname : JSFS_HOST,
    port     : JSFS_PORT,
    method   : 'POST',
    path     : path,
    headers  : {
      'X-Access-Key' : file.access_key,
      'Content-Type': 'application/octet-stream'
    }
  };

  console.log('Moving ' + fetch_url + ' to ' + JSFS_HOST + store_options.path);

  var storage_request = http.request(store_options).on('finish', function(){
                              console.log('File stored to', JSFS_HOST + store_options.path);
                            }).on('close', function(){
                              console.log('pipe closed, move next file');
                              return moveNextFile();
                            });

  http.get(fetch_options, function(fetch_response){
    fetch_response.pipe(storage_request).on('close', function(){
                    console.log('fetch response closed');
                  }).on('end', function(){
                    console.log('fetch response ended');
                  }).on('error', function(e){
                    console.log('fetch response error:', e.toString());
                  });
  }).on('finish', function(){
    console.log('fetch request finished');
  }).on('error', function(e){
    console.log('fetch request errored:', e.toString());
  }).on('close', function(){
    console.log('fetch request closed');
  });
}

function moveNextFile(){
  if (tracks.length > 0) {
    var next_track = tracks.pop();
    moveFile(next_track);
  } else {
    console.log('******** MIGRATION COMPLETED *********');
  }
}

// function migrateFiles(options){
//   if (!options.source){
//     console.error('Please specify a "source" jsfs, eg. "jsfs3.murfie.com" as part of an options object, ie. {options: "jsfs3.murfie.com", offset: 10000}');
//     return false;
//   }

//   if (!options.offset){
//     console.error('Please specify a "source" jsfs, eg. "jsfs3.murfie.com" as part of an options object, ie. {options: "jsfs3.murfie.com", offset: 10000}');
//     return false;
//   }

  var BASE_SQL = 'SELECT * FROM track_uploads WHERE url LIKE \'%' + SOURCE_HOST + '%\' OFFSET ' + OFFSET + ' LIMIT 10000';

  query(BASE_SQL, function(err, results){
    if (err) {
      console.error(err.toString());
      return;
    }

    console.log(results.length + ' tracks will be migrated from ' + SOURCE_HOST + ' starting at ' + OFFSET);
    tracks = results;
    moveNextFile();
  });
// }
