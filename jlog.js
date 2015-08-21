module.exports = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
	level: 0, // default log level
	path: null, // default is, don't log to a file
	message: function(severity, log_message){
		var fs = require("fs");
		if(severity >= this.level){
			console.log(Date() + "\t" + Math.round((process.memoryUsage().rss/1024)/1024) + "MB\t" + severity + "\t" + log_message);
			if(this.path){
				fs.appendFile(this.path, Date() + "\t" + Math.round((process.memoryUsage().rss/1024)/1024) + "MB\t" + severity + "\t" + log_message + "\n", function(err){
					if(err){
						console.log("Error logging message to file: " + err);
					}
				});
			}
		}
	}
};
