jsfs
====

A general-purpose http-accessible, distributed, versioned, deduplicating filesystem in Node.js.

#REQUIREMENTS

*  node.js

#CONFIGURE

*  Clone this repo
*  Copy config.ex to config.js
*  Edit config.js to set the storage path (where you want uploaded data stored) and the block size in bytes (1048576 is a good place to start)
*  Start the server (node jsfs.js is good enough, or pm2, etc. if you're fancy)

The server will then be listening on port 7302.  You can open simpleui.html in a browser to test things out or use the API below with curl (or to interface your own code).  jsfs will spit out stats and other debug information to the console as you interact with it.

In the future blocksize may be fixed.  Right now you can change it, but bear in mind that changing it will invalidate any data stored at a different block size.  This is an area I'm experimenting with and will be more elegant in the future, but for now when in doubt stick with 1MB (1048576).

Peers can be configured by including an object for each peer which include a host and port property.  If included, jsfs will search these peers for files that it can't find in its local store.  If files are found on peers they are transparently returned to the caller and cached locally as well.  Eventually this mechanism will also allow content to be pushed from the local jsfs instance to peer instances (for redundancy, publishing, etc.) but this is not quite ready yet.

Files stored in jsfs are automatically versioned.  By default, POSTing a new file to the address of an existing file will create a new version at the same address, and issuing a GET to that address will always return the most recent version.  If you want to request a specific revision of a file, use the versioned address as returned from the "index" call below and the specific file revision will be returned.

#API
    
##POST
Stores the supplied POST body as a file at the location specified in the request.  If a file exists at the specified location, an error is returned (eventually this will be overrideable when an authorization system exists).

###EXAMPLE
Request:

     curl -X POST --data-binary @Brinstar.mp3 "http://localhost:7302/mycontainer/Brinstar.mp3"
     
Result:

HTTP 200 if sucessful, HTTP 500 if not.

##GET
Returns a JSON index of stored files & metadata or the binary data of a specific file.

###EXAMPLE

Index request:

    curl "http://localhost:7302/"
    
Index result:

````
{
    "/666/t.tar": {
        "name": "/666/t.tar",
        "created": 1404226784502,
        "hashblocks": [
            "dc9f2f41ca71b5c85e684378c3b7d5395df2796e",
            "a8e913304d8379521acbacd05cfd45bd4855ac96",
            "9a7acc1e11e4038463667e43291a66622d3c1536"
        ]
    },
    "/667/t.tar": {
        "name": "/667/t.tar",
        "created": 1404226815261,
        "hashblocks": [
            "dc9f2f41ca71b5c85e684378c3b7d5395df2796e",
            "a8e913304d8379521acbacd05cfd45bd4855ac96",
            "9a7acc1e11e4038463667e43291a66622d3c1536"
        ]
    }
}

````
    
Specific File Request:

    curl "http://localhost:7302/mycontainer/Brinstar.mp3" > Brinstar.mp3