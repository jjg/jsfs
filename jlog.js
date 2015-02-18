module.exports = {
	//var log = {
		DEBUG: 0,
		INFO: 1,
		WARN: 2,
		ERROR: 3,
		level: 0, // default log level
		message: function(severity, log_message){
			if(severity >= this.level){
				console.log(Date() + "\t" + severity + "\t" + log_message);
			}
		}
	};
//}