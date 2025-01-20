# Installing JSFS on Rock64 Hardware

Pine64's [Rock64](https://www.pine64.org/devices/single-board-computers/rock64/) SBC is an inexpensive ARM computer well suited for running JSFS.  

## Prerequisites

### Node.js

Node is built from source using the follow steps (~ minutes):

0. sudo apt-get install python g++ make
1. wget https://nodejs.org/dist/v14.17.5/node-v14.17.5.tar.gz
2. tar zxf node-v14.17.5.tar.gz
3. cd node-v14.15.5
4. ./configure
5.  make -j4 (this step fails: g++: fatal error: Killed signal terminated program cc1plus
6. sudo make install

Try using precompiled binaries instead:

0. sudo apt install xz-utils
1. wget https://nodejs.org/dist/v14.17.5/node-v14.17.5-linux-arm64.tar.xz
2. tar -xf node-v14.17.5-linux-arm64.tar.xz


### Storage

You'll probably want to use something other than the boot SD card for storage.  Attach something via USB and mount it at boot like so:

### Test Run

 ~/node-v14.17.5-linux-arm64/bin/node ./server.js

 This fails with the following error:

 ```
 internal/modules/cjs/loader.js:892                                                                                                                     
   throw err;
     ^
                                                                                                                                                            
                                                                                                                                                        Error: Cannot find module 'through'
 ```

Looks like someone added undocumented dependencies...

Let's try and resolve that:

~/node-v14.17.5-linux-arm64/bin/node ~/node-v14.17.5-linux-arm64/bin/npm install through

This time the server starts.
