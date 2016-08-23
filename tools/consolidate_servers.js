"use strict";
/* globals require, console */

/*  CONFIGURATION  */
var DB_CONNECT  = 'postgres://marc:@localhost:5432/murfie_dev';
var SOURCE_HOST = 'jsfs4.murfie.com';
var SOURCE_PORT = '7302';
var OFFSET      = 0;

/*  SETUP  */
var http       = require('http');
var url        = require('url');
var query      = require('pg-query');
var tracks     = [];
var errors     = [];
var JSFS_HOST  = '127.0.0.1';
var JSFS_PORT  = '7302';
var SOURCE_IPS = {
  'jsfs-g.murfie.com' :   '10.240.123.180',
  'jsfs2.murfie.com'  :   '10.240.123.180',
  'jsfs3.murfie.com'  :   '10.240.0.3',
  'jsfs4.murfie.com'  :   '10.240.0.5',
  'jsfs5.murfie.com'  :   '10.240.0.6',
  'jsfs6.murfie.com'  :   '10.240.0.7',
  'jsfs7.murfie.com'  :   '10.240.0.8',
  'jsfs8.murfie.com'  :   '10.240.0.9',
  'jsfs9.murfie.com'  :   '10.240.0.10',
  'jsfs10.murfie.com' :   '10.240.0.11',
  'jsfs11.murfie.com' :   '10.240.0.12',
  'jsfs12.murfie.com' :   '10.240.0.13',
  'jsfs13.murfie.com' :   '10.240.0.14',
  'jsfs14.murfie.com' :   '10.240.0.15',
  'jsfs15.murfie.com' :   '10.240.0.17',
  'jsfs16.murfie.com' :   '10.240.0.19',
  'jsfs17.murfie.com' :   '10.240.0.20',
  'jsfs18.murfie.com' :   '10.240.0.21',
  'jsfs19.murfie.com' :   '10.240.0.23',
  'jsfs21.murfie.com' :   '10.240.0.24',
  'jsfs22.murfie.com' :   '10.240.0.25'
};

query.connectionParameters = DB_CONNECT;

var timer = function timer(name) {
  var start = new Date().getTime();
  return {
    stop: function() {
      var end  = new Date();
      var time = end.getTime() - start;
      console.log('Timer:', name, 'finished in', time, 'ms');
    },

    mark: function(title) {
      var now = new Date();
      var time = now.getTime() - start;
      console.log('Mark:', name, title, 'at', time, 'ms');
    }
  };
};

var clock = timer('JSFS migration');

function namespacedPath(url_parts){
  var path = url_parts.path;
  if (path.indexOf('/.') === 0) {
    return path;
  } else {
    return '/.' +url_parts.hostname.split('.').reverse().join('.') + path;
  }
}

function ipForSource(source){
  return SOURCE_IPS[source];
}

function moveFile(file){
  var path      = namespacedPath(url.parse(file.url));
  var fetch_url = file.url + '?access_key=' + file.access_key;
  var source_ip = ipForSource(SOURCE_HOST);

  if (!source_ip) {
    console.error('NO CONFIGURED IP FOR SOURCE', SOURCE_HOST);
    return;
  }

  var fetch_options = {
    hostname : source_ip,
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
                              clock.mark('File stored to ' + JSFS_HOST + store_options.path);
                              console.log(tracks.length, 'tracks remaining');
                            }).on('error', function(e){
                              console.log('storage_request error', e.toString());
                              errors.push(file);
                            });

  http.get(fetch_options, function(fetch_response){
    fetch_response.pipe(storage_request).on('close', function(){
                    return moveNextFile();
                  }).on('error', function(e){
                    console.log('fetch response error:', e.toString());
                    errors.push(file);
                  });
  }).on('error', function(e){
    console.log('fetch request errored:', e.toString());
    errors.push(file);
  });

  /***

    Order of events messages:
    fetch_request.on('finish')
    store_request.on('finish')
    fetch_request.on('close');
    store_request.on('close');
    fetch_response.on('close');

   **/
}

function moveNextFile(){
  if (tracks.length > 0) {
    var next_track = tracks.pop();
    moveFile(next_track);
  } else {
    console.log('******** MIGRATION COMPLETED *********');
    clock.stop();
    console.log('The following files experienced errors:', errors);
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

  var BASE_SQL = 'SELECT * FROM track_uploads WHERE url LIKE \'%' + SOURCE_HOST + '%\' ORDER BY id ASC OFFSET ' + OFFSET + ' LIMIT 10000';

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
