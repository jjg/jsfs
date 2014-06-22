jsfs
====

A general-purpose http-accessible, deduplicating node.js filesystem

#API

##GET

###EXAMPLE

Request:

    curl http://localhost:1313/mycontainer/Brinstar.mp3 > Brinstar.mp3
    
##POST

###EXAMPLE
Request:

     curl -X POST --data-binary @Brinstar.mp3 "http://localhost:1313/mycontainer/Brinstar.mp3"
     
Result:

HTTP 200 if sucessful, HTTP 500 if not (also "file exists" if an existing file has been posted to the specified location).

##DELETE

###EXAMPLE
Request:

    curl -X DELETE "http://localhost:1313/mycontainer/Brinstar.mp3"
    
Result:
HTTP 200 if sucessful, HTTP 500 if not.
    
