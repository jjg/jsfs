// a new jsos_jsfs object
var jsos_jsfs = function(){
	
	// private variables and methods
	var _keychain_root = "http://localhost:7302/keychains";
	var _keychain = {};
	_keychain.keys = {};
	var _hashed_uid = null;
	var _hashed_token = null;
	
	function save_keychain(){
		
		// if _hashed_uid is null, we're working anonymously so skip this
		if(_hashed_uid && _hashed_token){
			console.log("got save_keychain");
			var xhr = new XMLHttpRequest();
			xhr.open("PUT", _keychain_root + "/" + _hashed_uid, true);
	        xhr.setRequestHeader("x-access-token", _hashed_token);
	        xhr.onreadystatechange = parse_response;
	        xhr.send(JSON.stringify(_keychain));
	
	        function parse_response(){
	            if(this.readyState == 4){
	                if(this.status === 200){
	                    console.log("keychain updated");
	
	                    // update file list
						//callback;
	
	                } else {
	                    console.log("keychain update failed, HTTP " + this.status);
						//callback;
	                }
	            }
	        }
		} else {
			console.log("no keychain open, discarding update");
		}
	}
	
	function add_key(url,access_token){
		// add new key to keychain
		_keychain.keys[url] = {};
		_keychain.keys[url].access_token = access_token;
		save_keychain();
	}
	
	function hashit(value){
		var hash = 0, i, chr, len;
		if (value == 0){
			return hash;
		}
		for (i = 0, len = value.length; i < len; i++) {
			chr   = value.charCodeAt(i);
			hash  = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}
	
	return {
		
		// public variables and methods
		get_keychain: function(){
			return _keychain;
		},
		set_keychain: function(k){
			_keychain = k;
		},
		create_keychain: function(uid, token, create_keychain_callback){
			console.log("got create_keychain()");
			
			_hashed_uid = hashit(uid);
			_hashed_token = hashit(token);
			_keychain = {};
			_keychain.keys = {};
			var xhr = new XMLHttpRequest();
			xhr.open("POST", _keychain_root + "/" + _hashed_uid, true);
			xhr.setRequestHeader("Content-type","application/json");
			xhr.setRequestHeader("x-access-token", _hashed_token);
			xhr.setRequestHeader("x-private", "true");
			xhr.setRequestHeader("x-encrypted", "true");
			xhr.onreadystatechange = parse_response;
			xhr.send(JSON.stringify(_keychain));

			function parse_response(){
				if(this.readyState == 4){
					if(this.status === 200){
						console.log("keychain created");
						create_keychain_callback(true);
					} else {
						console.log("keychain creation failed, HTTP " + this.status);
						create_keychain_callback(false);
					}
				}
			}
		},
		open_keychain: function(uid, token, open_result_callback){
			console.log("got open_keychain()");
			
			_hashed_uid = hashit(uid);
			_hashed_token = hashit(token);
			
			// this is a hack
			var self = this;
			
			// try to load keychain
			var xhr = new XMLHttpRequest();
			xhr.open("GET", _keychain_root + "/" + _hashed_uid, true);
			xhr.setRequestHeader("x-access-token", _hashed_token);
			xhr.onreadystatechange = parse_response;
			xhr.send();
			
			function parse_response(){
				if(this.readyState === 4){
					console.log("load keychain request status: " + this.status);
					if(this.status === 200){
						// sucess!
						var response_object = JSON.parse(this.responseText);
						self.set_keychain(response_object);
						open_result_callback(true);
					} else {
						// failure!
						console.log("unable to load keychain for these credentials, HTTP " + this.status);
						open_result_callback(false);
					}
				}
			}
		},
		store_object: function(obj, url, private, encrypted, result_callback, overwrite){

			console.log("got store_object()");
			
			// this is a hack
			var self = this;
			
			var xhr = new XMLHttpRequest();
			xhr.open("POST", url, true);
			xhr.setRequestHeader("Content-type","application/json");
			
			// add optional jsfs-specific headers if requested
			if(private){
				xhr.setRequestHeader("x-private", "true");
			}
			
			if(encrypted){
				xhr.setRequestHeader("x-encrypted", "true");
			}
			
			xhr.onreadystatechange = parse_response;
			xhr.send(JSON.stringify(obj));

			// organize results
			var storage_result = {};
			
			function parse_response(){
				if(this.readyState == 4){
					if(this.status === 200){
						console.log("object stored");
						var storage_result = JSON.parse(this.responseText);
						add_key(url, storage_result.access_token);
						storage_result.success = true;
						result_callback(storage_result);
					} else if(this.status === 405 && overwrite){
						// try to find an access token for this url
						kc = self.get_keychain();
						if(kc.keys[url]){
							console.log("overwriting existing object " + url);
							overwrite_existing(kc.keys[url].access_token);
						} else {
							console.log("no access token to overwrite " + url);
							self.storage_result.success = false;
							result_callback(self.storage_result);
						}
					} else {
						console.log("store object failed, HTTP " + this.status);
						self.storage_result.success = false;
						self.storage_result.http_status = this.status;
						result_callback(self.storage_result);
					}
				}
			}
			
			function overwrite_existing(access_token){
				
				xhr.open("PUT", url, true);
				xhr.setRequestHeader("Content-type","application/json");
				xhr.setRequestHeader("x-access-token", access_token);
				
				// add optional jsfs-specific headers if requested
				if(private){
					xhr.setRequestHeader("x-private", "true");
				}
				
				if(encrypted){
					xhr.setRequestHeader("x-encrypted", "true");
				}
				
				xhr.onreadystatechange = parse_response;
				xhr.send(JSON.stringify(obj));
			}
		},
		load_object: function(url, result_callback){
			
			console.log("got load_object()");
			
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			//xhr.setRequestHeader("x-access-token", _hashed_token);
			xhr.onreadystatechange = parse_response;
			xhr.send();
			
			function parse_response(){
				if(this.readyState === 4){
					console.log("load object request status: " + this.status);
					if(this.status === 200){
						// sucess!
						var response_object = JSON.parse(this.responseText);
						result_callback(response_object);
						//self.set_keychain(response_object);
						//open_result_callback(true);
					} else {
						// failure!
						console.log("unable to load object, HTTP " + this.status);
						result_callback(false);
						//open_result_callback(false);
					}
				}
			}
		},
		store_file: function(file, url, private, encrypted, progress_callback, overwrite){
			
			console.log("got store_file()");
			
			// this is a hack
			var self = this;
			
			var xhr = new XMLHttpRequest();
			xhr.open("POST", url + '/' + file.name, true);
			xhr.setRequestHeader("X_FILENAME", file.name);
			xhr.setRequestHeader("Content-type", file.type)
			
			// add optional jsfs-specific headers if requested
			if(private){
				xhr.setRequestHeader("x-private", "true");
			}
			
			if(encrypted){
				xhr.setRequestHeader("x-encrypted", "true");
			}
			
			xhr.upload.onprogress = upload_progress;
			xhr.onreadystatechange = parse_response;
			xhr.send(file);
			
			// this formats the upload progress nicely as the upload proceeds
			var current_progress = {};
			
			function upload_progress(progress){
				current_progress.file_size = progress.total;
				current_progress.amount_uploaded = progress.loaded;
				current_progress.percent_complete = (current_progress.amount_uploaded / current_progress.file_size) * 100;
				
				if(current_progress.percent_complete === 100){
					//progress_status.status = "complete";
				} else {
					current_progress.status = "uploading";
				}
				progress_callback(current_progress);
			}
			
			function parse_response(){
				if(this.readyState == 4){
					if(this.status === 200){
						console.log('done uploading ' + file.name);
						// extract access_token from response
						var post_result = JSON.parse(this.responseText);
						add_key(url + "/" + file.name, post_result.access_token);
						current_progress.status = "complete";
						progress_callback(current_progress);
					} else if(this.status === 405 && overwrite) {
						// try to find an access token for this url
						kc = self.get_keychain();
						if(kc.keys[url + "/" + file.name]){
							console.log("overwriting existing file " + url + "/" + file.name);
							current_progress.status = "overwriting";
							progress_callback(current_progress);
							overwrite_existing(kc.keys[url + "/" + file.name].access_token);
						} else {
							console.log("no access token to overwrite " + url + "/" + file.name);
							current_progress.status = "error";
							current_progress.http_status = this.status;
							progress_callback(current_progress);
						}
					} else {
						console.log("Error saving file, HTTP " + this.status);
						// notify caller of error
						current_progress.status = "error";
						current_progress.http_status = this.status;
						progress_callback(current_progress);
					}
				}
			}
			
			function overwrite_existing(access_token){
				xhr.open("PUT", url + "/" + file.name, true);
				xhr.setRequestHeader("Content-type","application/json");
				xhr.setRequestHeader("x-access-token", access_token);
				
				// add optional jsfs-specific headers if requested
				if(private){
					xhr.setRequestHeader("x-private", "true");
				}
				
				if(encrypted){
					xhr.setRequestHeader("x-encrypted", "true");
				}
				
				xhr.onreadystatechange = parse_response;
				xhr.send(file);
			}
		}
	};
}