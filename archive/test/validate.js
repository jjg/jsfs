var expect   = require('chai').expect
var validate = require("../lib/validate.js");
var log      = require("../jlog.js");
var config   = require("../config.js");
var utils    = require("../lib/utils.js");

var GOOD_KEY = "testing_key";
var BAD_KEY  = "wrong_key";
var INODE    = { access_key: GOOD_KEY };
var GET      = "GET";

function setExpire(minutes){
  var d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.getTime();
}

describe("validation.js", function(){

  before(function(){
    // suppress debug log output for tests
    log.level = 4;
  });

  after(function(){
    // restore default log level
    log.level = config.LOG_LEVEL
  });

  describe("#has_key(inode, params)", function() {
    it("should validate an access_key", function() {
      var params = { access_key: GOOD_KEY };
      var result = validate.has_key(INODE, params);

      expect(result).to.be.true;
    });

    it("should reject an incorrect access_key", function() {
      var params = { access_key: BAD_KEY };
      var result = validate.has_key(INODE, params);

      expect(result).to.be.false;
    });

  });

  describe("#is_authorized(inode, method, params)", function() {

    it("should validate an access_key", function() {
      var params = { access_key: GOOD_KEY };
      var result = validate.is_authorized(INODE, GET, params);

      expect(result).to.be.true;
    });

    it("should reject an incorrect access key", function(){
      var params = { access_key: BAD_KEY };
      var result = validate.is_authorized(INODE, GET, params);

      expect(result).to.be.false;
    });

    it("should validate an access token", function(){
      var params = { access_token: utils.sha1_to_hex(GOOD_KEY + GET) };
      var result = validate.is_authorized(INODE, GET, params);

      expect(result).to.be.true;
    });

    it("should reject an access token for wrong method", function(){
      var params = { access_token: utils.sha1_to_hex(GOOD_KEY + "POST") };
      var result = validate.is_authorized(INODE, GET, params);

      expect(result).to.be.false;
    });

    it("should reject wrong access token", function(){
      var params = { access_token: utils.sha1_to_hex(BAD_KEY + GET) };
      var result = validate.is_authorized(INODE, GET, params);

      expect(result).to.be.false;
    });

    it("should validate a future time token", function() {
      var expires = setExpire(30);
      var params  = {
        access_token : utils.sha1_to_hex(GOOD_KEY + GET + expires),
        expires      : expires
      };
      var result = validate.is_authorized(INODE, GET, params)

      expect(result).to.be.true;
    });

    it("should reject an expired time token", function() {
      var expires = setExpire(-1);
      var params = {
        access_token : utils.sha1_to_hex(GOOD_KEY + GET + expires),
        expires      : expires
      };
      var result = validate.is_authorized(INODE, GET, params);

      expect(result).to.be.false;
    });

    it("should validate HEAD requests", function(){
      var params = { access_token: utils.sha1_to_hex(BAD_KEY + GET) };
      var result = validate.is_authorized(INODE, "HEAD", params);

      expect(result).to.be.true;
    });

    it("should validate OPTIONS requests", function(){
      var params = { access_token: utils.sha1_to_hex(BAD_KEY + GET) };
      var result = validate.is_authorized(INODE, "OPTIONS", params);

      expect(result).to.be.true;
    });

  });
});
