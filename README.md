jsfs
====

A general-purpose, deduplicating filesystem with a REST interface, jsfs is intended to provide low-level filesystem functions for Javascript applications.  Additional functionality (private file indexes, token lockers, centralized authentication, etc.) are deliberately avoided here and will be implemented in a modular fashion on top of jsfs.

#STATUS
jsfs 2.x is a from-scratch rewrite of the original jsfs filesystem.  In its current form, it lacks the versioning and distributed functions of the original jsfs, however these features will return in later builds.  Additionally, the API for jsfs 2.x has been simplified while providing more functionality and an effort has been made to better comply with HTTP conventions.

#REQUIREMENTS
* Node.js

#CONFIGURATION
*  Clone this repository
*  Copy config.ex to config.js
*  Create the `blocks` directory (`mkdir blocks`)
*  Start the server (`node jsfs.js` foreman, pm2, etc.)

If you don't like storing the data in the same directory as the code (smart), edit config.js to change the location where data (blocks) are stored and restart jsfs for the changes to take effect. If you've already stored data in jsfs, you'll want to move the contents of the existing `blocks` directory to the new location or you'll loose the data.

#API

##HEADERS
jsfs uses several custom headers to control access to data and how it is stored.

###x-private
Set this header to `true` to mark files as private (they won't show up in directory listings).  *NOTE:* since private files don't show up in directory listings you'll have to keep track of the URL's yourself.  Additionally, to access private files a valid `x-access-token` header must be supplied with the `GET` request.

###x-encrypted
Set this header to `true` to encrypt stored data before it is stored on-disk.  Once enabled decryption happens automatically on `GET` requests and additional modifications via `PUT` will be encrypted as well. *NOTE:* encryption increases CPU utilization and reduces deduplication performance so use only when necissary.

###x-access-token
This header is used to authorize requests that modify existing files (`PUT`, `DELETE`).  The token is provided as part of the response when a new file is `POST`ed to a URL.  To perform further updates to a new file you'll need to keep track of this token.

##Temporary/Expiring URLs
Sometimes you need to grant temporary access to an otherwise private file.  You can generate a time-limited url for any file stored privately (see `x-private` header above) so long as you posess a valid `access_token` for the file using the following steps:

1.  Generate a expiration timestamp in milliseconds since midnight, January 1st, 1970 (in Javascript `(new Date()).getTime()` yields the current time in this format)
2.  Concatinate the `access_token` of the desired file with the number generated above to create a single string
3.  Generate an sha1 hex hash of the string (refer to https://github.com/jjg/jsfs/blob/master/jsfs.js#L99 for an example)

To use the temporary URL, pass the timestamp along with the hash as parameters of a GET request for the file, like so:

`curl "http://localhost:7302/music/Brinstar.mp3?expire_time=2422995348828&time_token=63556d4f6cb3459f1cd2ac33ea53ad10da5d7725"`

JSFS first validates the timestamp against the local (server) time to make sure it hasn't already expired, then performs a hash comparison between the supplied `time_token` and the known `access_token` of the requested file.  If either test fails, the call returns `401 unauthorized`.


##POST
Stores a new file at the specified URL.  If the file exists jsfs returns `405 method not allowed`.

###EXAMPLE
Request:

     curl -X POST --data-binary @Brinstar.mp3 "http://localhost:7302/music/Brinstar.mp3"

Response:
````
{
    "created": 1420309092678,
    "version": 0,
    "private": false,
    "encrypted": false,
    "access_token": "7092bee1ac7d4a5c55cb5ff61043b89a6e32cf71",
    "content_type": "application/x-www-form-urlencoded",
    "file_size": 179186,
    "block_size": 1048576,
    "blocks": [
        "7653454f4c8c859bed57a44d59c6b536b0518192"
    ]
}
````

It's also possible to provide a custom `access_token` by setting the `x-access-token` header (useful if you want to generate/manage tokens using an external system):

     curl -X POST -H "x-access-token: richardnixonshead" --data-binary @metroid_brinstar.mp3 http://localhost:7302/music/metroid_brinstar.mp3
     
Response
````
{
    "created": 1423062575167,
    "version": 0,
    "private": false,
    "encrypted": false,
    "access_token": "richardnixonshead",
    "content_type": "application/x-www-form-urlencoded",
    "file_size": 3960832,
    "block_size": 1048576,
    "blocks": [
        "423fb973adc699fb302a77401a47a2f89cc2cda7",
        "b514a114beb553d710e9afb959dfba874b74060b",
        "c3ae28f6b9c614e918876a326e01ddceac237d11",
        "babef485cc800cd76c118665dd2b8d7c022bd164"
    ]
}
````

JSFS automatically "namespaces" URL's based on the host name used to make the request.  This makes it easy to create partitioned storage by pointing multiple hostnames at the same JSFS server.  This is accomplished by expanding the host in reverse notation (i.e.: `foo.com` becomes `.com.foo`); this is handled transparrently by JSFS from the client's perspective.

This means that you can point DNS records for `foo.com` and `bar.com` to the same JSFS server and then POST `http://foo.com:7302/files/baz.txt` and `http://bar.com:7302/files/baz.txt` without a conflict.

This also means that `GET http://foo.com:7302/files/baz.txt` and `GET http://bar.com:7302/files/baz.txt` do not return the same file, however if you need to access a file stored via a different host you can reach it using its absolute address (in this case, `http://bar.com:7302/.com.foo/files/baz.txt`).

##GET
Retreives the file at the specified URL.  If the file does not exist a `404 not found` is returned.  If the URL ends with a trailing slash `/` a directory listing of non-private files stored at the specified location.

###EXAMPLE
Request (directory):

     curl http://localhost:7302/music/

Response:

````
[
    "Brinstar.mp3",
    "Opening.mp3",
    "Mother_Brain.mp3"
]
````

Request (file):

     curl -o Brinstar.mp3 http://localhost:730s/music/Brinstar.mp3

Response:
The binary file is stored in new local file called `Brinstar.mp3`.

##PUT
Updates an existing file stored at the specified location.  This method requires authorization, so requests must include a valid `x-access-token` header for the specific file, otherwise `401 unauthorized` will be returned.  If the file does not exist `405 method not allowed` is returned.

###EXAMPLE
Request:

     curl -X PUT -H "x-access-token: 7092bee1ac7d4a5c55cb5ff61043b89a6e32cf71"  --data-binary @Brinstar.mp3 "http://localhost:7302/music/Brinstar.mp3"

Result:
````
{
    "created": 1420309092678,
    "version": 0,
    "private": false,
    "encrypted": false,
    "access_token": "7092bee1ac7d4a5c55cb5ff61043b89a6e32cf71",
    "content_type": "application/x-www-form-urlencoded",
    "file_size": 179186,
    "block_size": 1048576,
    "blocks": [
        "7653454f4c8c859bed57a44d59c6b536b0518192"
    ],
    "updated": 1420309368172
}
````

##DELETE
Removes the file at the specified URL.  This method requires authorization so requests must include a valid `x-access-token` header for the specified file.  If the token is not supplied or is invalid `401 unauthorized` is returend.  If the file does not exist `405 method not allowed` is returned.

###Example
Request:

     curl -X DELETE -H "x-access-token: 7092bee1ac7d4a5c55cb5ff61043b89a6e32cf71" "http://localhost:7302/music/Brinstar.mp3"

Response
`HTTP 200` if sucessful.

##HEAD
Returns status and header information for the specified URL.

###Example
Request:

    curl -I "http://localhost:7302/music/Brinstar.mp3"

Response:
````
HTTP/1.1 200 OK
Content-Type: application/x-www-form-urlencoded
Content-Length: 179186
Date: Sat, 03 Jan 2015 18:24:53 GMT
Connection: keep-alive
````
