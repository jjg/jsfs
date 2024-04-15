const vm = require('node:vm');
const { Duplex } = require('node:stream');

var log = require("../jlog.js");

class ExecutableStream extends Duplex {
  constructor(x_in) {
    super();
    this.x_in = x_in;
    this.code = "";
    this.x_done = false;
  }
  _write(chunk, encoding, callback) {

    // TODO: Figure out a way to buffer chunks until we have the whole program.
    this.code = this.code + chunk.toString();

    log.message(log.INFO, "Executing " + this.code.length + " bytes of Javascript...");

    // This provides a basic unix-like in/out/error interface to executable code.
    // * x_in is currently the entire `request` object sent by the client
    // * x_out is written back to the client via the `response` object
    // * x_err is written to JSFS logs
    // A better solution would provide the client a way to access the logs,
    // but I don't have a good answer for that yet.
    //
    // x_push() can be used to stream output from X code, if called, the
    // data passed to the function will in turn be passed down the pipeline
    // to the response and ultimately the caller.

    // NOTE: This nonsense is needed to give access to the Duplex `push()` method
    function make_x_push(t) {
      return function (s) {
        t.push(s);
      };
    }

    const context = {
      x_in: this.x_in,
      x_out:"",
      x_err:"",
      x_push: make_x_push(this)
    };
    vm.createContext(context);
    log.message(log.INFO, "Execution context created.");

    vm.runInContext(this.code, context)
    log.message(log.INFO, "Execution complete!");

    if(context.x_err.length > 0) {
      log.message(log.INFO, "Execution error logs: " + context.x_err);
    }

    // If the code used the x_out interface, write it out now (this may be depreciated)
    if(context.x_out.length > 0){
      this.push(context.x_out);
    }
    this.x_done = true;

    callback();
  }
  _read(size){
    if(this.x_done){
      this.push(null);
    }
  }
}

module.exports = ExecutableStream;
