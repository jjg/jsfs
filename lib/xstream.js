const vm = require('node:vm');
const { Transform } = require('node:stream');

var log = require("../jlog.js");

class ExecutableStream extends Transform {
  constructor(x_in) {
    super();
    this.x_in = x_in;
    this.code = "";
  }
  _flush(callback) {

    log.message(log.INFO, "Executing " + this.code.length + " bytes of Javascript...");

    // Experimental streaming event thing...
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
    vm.runInContext(this.code, context)
    log.message(log.INFO, "Execution complete!");

    if(context.x_err.length > 0) {
      log.message(log.INFO, "Execution error logs: " + context.x_err);
    }

    log.message(log.INFO, "Returning " + context.x_out.length + " bytes of data from executing Javascript");
    this.push(context.x_out);

    callback();
  }
  _transform(chunk, encoding, callback){
    this.code = this.code + chunk.toString();
    callback(null);
  }
}

module.exports = ExecutableStream;
