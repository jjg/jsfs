jsfs
====

A general-purpose http-accessible, deduplicating node.js filesystem

#API
    
##POST

###EXAMPLE
Request:

     curl -X POST --data-binary @Brinstar.mp3 "http://localhost:1313/mycontainer/Brinstar.mp3"
     
Result:

HTTP 200 if sucessful, HTTP 500 if not (also "file exists" if an existing file has been posted to the specified location).

##GET

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

###EXAMPLE
Request:

    curl -X DELETE "http://localhost:1313/mycontainer/Brinstar.mp3"
    
Result:
HTTP 200 if sucessful, HTTP 500 if not.
    
