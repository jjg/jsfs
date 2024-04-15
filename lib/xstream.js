const vm = require('node:vm');
const { Duplex } = require('node:stream');

var log = require("../jlog.js");

class ExecutableStream extends Duplex {
  constructor(x_in) {
    super();
    this.x_in = x_in;
    //this.x_out = "";  // TODO: maybe this should be buffer, etc.?
    this.code = "";
    this.x_done = false;
  }
  //_flush(callback) {
  _write(chunk, encoding, callback) {

    console.log("Got _write()");

    // TODO: Figure out a way to buffer chunks until we have the whole program.
    this.code = this.code + chunk.toString();

    log.message(log.INFO, "Executing " + this.code.length + " bytes of Javascript...");

    // Experimental streaming event thing...
    // TODO: Rename this and use it to stream data from inside the X
    var gong = function gong(n) {
      console.log("Got gong: " + n);
    };

    // This provides a basic unix-like in/out/error interface to executable code.
    // * x_in is currently the entire `request` object sent by the client
    // * x_out is written back to the client via the `response` object
    // * x_err is written to JSFS logs
    // A better solution would provide the client a way to access the logs,
    // but I don't have a good answer for that yet.
    const context = {
      x_in: this.x_in,
      x_out:"",
      x_err:"",
      gong: gong
    };

    vm.createContext(context);
    vm.runInContext(this.code, context) // x_out is set by code inside here
    log.message(log.INFO, "Execution complete!");

    if(context.x_err.length > 0) {
      log.message(log.INFO, "Execution error logs: " + context.x_err);
    }

    log.message(log.INFO, "Returning " + context.x_out.length + " bytes of data from executing Javascript");
    //this.x_out = context.x_out;
    this.x_done = true;

    // Why not?
    this.push(context.x_out);

    callback();
  }
  _read(size){

    console.log("Got _read()");
    console.log("this.x_out: " + this.x_out);
    console.log("this.x_done: " + this.x_done);

    if(this.x_done){
      this.push(null);
    } else {
      //this.push(this.x_out);
    }

    //return this.x_out.length;
  }



  /*
  _transform(chunk, encoding, callback){
    this.code = this.code + chunk.toString();
    callback(null);
  }
  */
}

module.exports = ExecutableStream;
