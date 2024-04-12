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

    // TODO: Ideally this would handle things like `console.log()` automatically,
    // but for now we'll just define some sort of unix-like standard.
    const context = {
      x_in: this.x_in,
      x_out:"",
      x_err:""
    };

    vm.createContext(context);
    vm.runInContext(this.code, context)
    log.message(log.INFO, "Execution complete!");

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
