"use strict";
/* globals require, console, process */

/*  CONFIGURATION  */
var DB_CONNECT  = process.env.DB || 'postgres://marc:@localhost:5432/murfie_dev';
var SOURCE_HOST = process.env.SOURCE_HOST || 'jsfs12.murfie.com';
var SOURCE_PORT = process.env.SOURCE_PORT || '7302';
var OFFSET      = process.env.OFFSET || 0;
var LIMIT       = process.env.LIMIT || 10000;
var ENV         = process.env.ENV || 'development';
var REDIS_URL   = process.env.REDIS_URL || 'redis://localhost:6379';
var MURFIE_API  = ENV === 'development' ? 'localhost:5000' : 'api.murfie.com';

/*  SETUP  */
var redis;
var http         = require('http');
var https        = require('https');
var url          = require('url');
var query        = require('pg-query');
var log          = require('../jlog.js');
var timer        = require('./timer.js');
var SOURCE_IPS   = require('./source_ips.js');
var tracks       = [];
var errors       = [];
var JSFS_HOST    = ENV === 'development' ? 'localhost' : '10.240.0.2';
var JSFS_PORT   = '7302';

var JSFS_SOURCES = {
  'jsfs20.murfie.com' : [ 'jsfs4.murfie.com',
                          'jsfs5.murfie.com',
                          'jsfs6.murfie.com',
                          'jsfs7.murfie.com',
                          'jsfs8.murfie.com',
                          'jsfs9.murfie.com',
                          'jsfs10.murfie.com',
                          'jsfs11.murfie.com',
                          'jsfs20.murfie.com'
                        ]
};

var dups = 0;

// Object.keys(JSFS_SOURCES).map(function(a){return JSFS_SOURCES[a].join('|')}).join('|')

var SOURCE_TESTER = new RegExp(Object.keys(JSFS_SOURCES).join('|').replace(/\./g, '\\.'));

process.on('beforeExit', function(){
  console.log('process.beforeExit:', arguments, tracks.length, 'tracks remaining');
});

process.on('exit', function(code){
  log.message(log.DEBUG ,'About to exit with code: ' + code);
});

process.on('uncaughtException', function(err){
  console.log("Caught exception:", err);
});

process.on('unhandledRejection', function(reason, p){
  console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
  // application specific logging, throwing an error, or other logic here
});

log.message(log.INFO, '******* MIGRATING ' + LIMIT + ' FILES FROM ' + SOURCE_HOST + ' OFFSET ' + OFFSET + ' ********');

query.connectionParameters = DB_CONNECT;

var clock;

function loadFromRedis(disc_id, callback){
  try{
    redis.get(disc_id, function(err, value){
      if (err){ log.message(log.ERROR, 'redis.get error: ' + err.toString()); }
      return callback(err, value);
    });
  } catch(ex){
    log.message(log.ERROR, 'redis.get exception: ' + ex.toString());
    return callback(ex);
  }
}

function loadFromPostgres(disc_id, source, callback){
  var sql = 'WITH current_album AS (SELECT discs.album_id FROM discs'
          + ' WHERE discs.id = ' + disc_id
          + ') SELECT url FROM track_uploads JOIN discs ON discs.id = track_uploads.disc_id '
          + ' WHERE discs.album_id IN (SELECT * FROM current_album) '
          + ' AND discs.storage_service = \'JSFS\' '
          + ' AND track_uploads.url SIMILAR TO \'%(' + JSFS_SOURCES[source].join('|') + ')%\' LIMIT 1';

  return query(sql, callback);
}

function checkForMatchingAlbum(disc_id, callback) {

  loadFromRedis(disc_id, function(err1, value){
    if (value) { return callback(value); }

    var servers = Object.keys(JSFS_SOURCES);
    var i = 0;

    var checkDBResult = function checkDBResult(err2, result){
      if (result && result.length > 0) {
        var r = servers[i];

        redis.set(disc_id, r, function(err3){
          if (err3) {
            log.message(log.ERROR, err3.toString());
            return process.abort();
          }

          redis.expire(disc_id, 900, function(err4){
            if (err4) {
              log.message(log.ERROR, err4.toString());
              return process.abort();
            }
            callback(r);
          });
        });
      } else if (i+1 === servers.length) {
        callback(false);
      } else {
        i++;
        loadFromPostgres(disc_id, servers[i], checkDBResult);
      }
    }

    loadFromPostgres(disc_id, servers[i], checkDBResult);
  });
}

function namespacedPath(url_parts){
  var path = url_parts.path;
  if (path.indexOf('/.') === 0) {
    return path;
  } else {
    return '/.' + url_parts.hostname.split('.').reverse().join('.') + path;
  }
}

function logError(e, s){
  s = s || '';
  var message = e.message || e.toString();
  log.message(log.ERROR, s + message);
}

function updatedURL(path, result){
  // 'jsfs20.murfie.com'
  // console.log(arguments);
  return path.replace(/jsfs\d*\.murfie\.com/, result);
}

function moveFile(file){
  var parsed_url = url.parse(file.url);
  var path       = namespacedPath(parsed_url);
  var fetch_url  = file.url + '?access_key=' + file.access_key;
  var source_ip  = ENV === 'development' ? SOURCE_HOST : SOURCE_IPS[SOURCE_HOST];

  if (!source_ip) {
    log.message(log.ERROR, 'NO CONFIGURED IP FOR SOURCE: ' + SOURCE_HOST + '. ABORTING.');
    process.abort();
  }

  var fetch_options = {
    hostname : source_ip,
    port     : SOURCE_PORT,
    path     : path,
    agent    : false,
    headers  : {
      'X-Access-Key' : file.access_key
    }
  };

  checkForMatchingAlbum(file.disc_id, function(result){
    // example result : 'jsfs20.murfie.com'

    var update_file  = !!result;

    var updated_url  = update_file ? updatedURL(file.url, result) : undefined;
    var storage_path = update_file ? namespacedPath(url.parse(updated_url)) : path;
    var hostname     = update_file ? SOURCE_IPS[result] : JSFS_HOST;

    var store_options = {
      hostname : hostname,
      port     : JSFS_PORT,
      method   : 'POST',
      path     : storage_path,
      agent    : false,
      headers  : {
        'X-Access-Key' : file.access_key,
        'Content-Type' : 'application/octet-stream',
        'X-Private'    : true
      }
    };

    log.message(log.INFO, 'Moving ' + fetch_url + ' to ' + hostname + storage_path);

    /*******

      If no 'response' handler is added, then the response will be entirely discarded.
      However, if you add a 'response' event handler, then you must consume the data
      from the response object, either by calling response.read() whenever there is a
      'readable' event, or by adding a 'data' handler, or by calling the .resume() method.
       Until the data is consumed, the 'end' event will not fire. Also, until the data is
       read it will consume memory that can eventually lead to a 'process out of memory' error.

      Order of events messages:
      fetch_request.on('finish')
      store_request.on('finish')
      fetch_request.on('close');
      store_request.on('close');
      fetch_response.on('close');

    */

    var store_request = http.request(store_options).on('error', function(e){
      logError(e, 'ERROR: store request error for track ' + fetch_url + ': ');
      errors.push(file);
    });

    http.get(fetch_options, function(fetch_response){

      fetch_response.pipe(store_request, {end: true})
                    .on('close', function(){
                      log.message(log.INFO, 'File stored to ' + hostname + store_options.path);
                      store_request.end();
                      if (update_file) {
                        updateUpload(file, updated_url);
                      } else {
                        moveNextFile();
                      };
                    }).on('error', function(e){
                      logError(e, 'ERROR: fetch response error for track ' + fetch_url + ': ');
                      errors.push(file);
                    });
    }).on('error', function(e){
      logError(e, 'ERROR: fetch request error for track ' + fetch_url + ': ');
      errors.push(file);
    });

  });
}

function updateUpload(file, path){
  dups++;
  log.message(log.INFO, 'Updating track_upload ' + file.id + ' with ' + path);

  var data = {
    access_key : file.access_key,
    url        : path
  };

  var options = {
    hostname : MURFIE_API,
    path     : '/uploads/' + file.id,
    method   : 'PUT',
    agent    : false,
    headers  : {
      'Content-Type' : 'application/json'
    }
  };

  var update = https.request(options)
                    .on('error', function(err){
                      logError(err, 'ERROR: problem updating track upload record ' + path + ': ');
                      errors.push(file);
                    })
                    .on('close', function(){ return moveNextFile(); });

  update.write(JSON.stringify(data));
  update.end();
}

function moveNextFile(){
  log.message(log.DEBUG, tracks.length +' tracks remaining');
  if (tracks.length > 0) {
    var next_track = tracks.shift();
    if (SOURCE_TESTER.test(next_track.url)) {
      log.message(log.INFO, 'Track url already updated. Skipping.')
      moveNextFile();
    } else {
      moveFile(next_track);
    }
  } else {
    log.message(log.INFO, '******** ' + SOURCE_HOST + ' MIGRATION OFFSET ' + OFFSET + ' COMPLETED *********');
    clock.stop();
    log.message(log.ERROR, 'The following files experienced errors: ' + JSON.stringify(errors));
    log.message(log.INFO, 'Total tracks stored on jsfs20: ' + dups);
    redis.quit(); // redis connection keeps process from exiting.
  }
}

try{
  redis = require('redis-url').connect(REDIS_URL);
  redis.on('error', function (err) {
    console.error('Redis error:', err);
  }).on('connect', function(){
    console.log('kick it off');
    // if i start at the front, i need to include jsfs20 tracks, since I'll be updating their URL
    // so the overall list would become smaller and I'd miss chunks of tracks unless I
    // move back my offset based on the number of updated records

    // if I pick them up, i'll have a progressively growing list and will need to skip over them

    // what if i start at the end and move to the start?
    // think this through...

    // var BASE_SQL = 'SELECT * FROM track_uploads WHERE url SIMILAR TO  \'%(' + Object.keys(JSFS_SOURCES).join('|') + '|' + SOURCE_HOST + ')%\' ORDER BY id ASC OFFSET ' + OFFSET + ' LIMIT ' + LIMIT;
    var BASE_SQL = 'SELECT * FROM track_uploads WHERE url LIKE \'%' + SOURCE_HOST + '%\' ORDER BY id ASC OFFSET ' + OFFSET + ' LIMIT ' + LIMIT;

    query(BASE_SQL, function(err, results){
      if (err) {
        log.message(log.ERROR, 'SQL error: ' + err.toString());
        process.abort();
      }

      clock = timer(results.length + ' tracks from ' + SOURCE_HOST + ' starting at ' + OFFSET);
      log.message(log.INFO, results.length + ' tracks will be migrated from ' + SOURCE_HOST + ' starting at ' + OFFSET);
      tracks = results;
      moveNextFile();
    });
  });
} catch(ex){
  console.log('error connecting to redis');
  console.log(ex);
  process.abort();
}
