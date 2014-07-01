jsfs
====

A general-purpose http-accessible, deduplicating node.js filesystem

#REQUIREMENTS

*  node.js

#CONFIGURE

*  Clone this repo
*  Copy config.ex to config.js
*  Edit config.js to set the storage path (where you want uploaded data stored) and the block size in bytes (1048576 is a good place to start)
*  Start the server (node jsfs.js is good enough, or pm2, etc. if you're fancy)

The server will then be listening on port 1313.  You can open simpleui.html in a browser to test things out or use the API below with curl (or to interface your own code).  jsfs will spit out stats and other debug information to the console as you interact with it.

In the future blocksize may be fixed.  Right now you can change it, but bear in mind that changing it will invalidate any data stored at a different block size.  This is an area I'm experimenting with and will be more elegant in the future, but for now when in doubt stick with 1MB (1048576).

#API
    
##POST
Stores the supplied POST body as a file at the location specified in the request.  If a file exists at the specified location, an error is returned (eventually this will be overrideable when an authorization system exists).

###EXAMPLE
Request:

     curl -X POST --data-binary @Brinstar.mp3 "http://localhost:1313/mycontainer/Brinstar.mp3"
     
Result:

HTTP 200 if sucessful, HTTP 500 if not (also "file exists" if an existing file has been posted to the specified location).

##GET
Returns a JSON index of stored files & metadata or the binary data of a specific file.

###EXAMPLE

Index request:

    curl "http://localhost:1313/"
    
Index result:

````
{
    "/mycontainer/Brinstar.mp3": {
        "hash": "e17417737a84c36ccc20f15086f14c4b29e5ceb2",
        "contentSize": 14922579,
        "onDiskSize": 14922579
    }
}
````
    
Specific File Request:

    curl "http://localhost:1313/mycontainer/Brinstar.mp3" > Brinstar.mp3
    
##DELETE
Deletes the file at the specified location.  Returns an error if the file does not exist, or could not be deleted.

###EXAMPLE
Request:

    curl -X DELETE "http://localhost:1313/mycontainer/Brinstar.mp3"
    
Result:
HTTP 200 if sucessful, HTTP 500 if not.
    
