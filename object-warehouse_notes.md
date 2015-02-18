Some notes about the merging of object-warehouse functionality into JSFS.

The main change was adding JWT support to JSFS which allows access tokens (x-access-token) to carry information about what the token can do.  The properties of these tokens are:

owner: boolean indicating if this is an owner token or not
fingerprint: hash uniquely identifying this instance of the object
url: the path at which the object resides
POST: boolean indicating if this token authorizes use of the POST verb
GET:  boolean indicating if this token authorizes use of the GET verb
PUT:  boolean indicating if this token authorizes use of the PUT verb
DELETE:  boolean indicating if this token authorizes use of the DELETE verb

The original header-based JSFS permission flags still apply, so an object stored (POST) with the x-private header set will only be accessible if a valid token is presented, and objects stored with the x-encrypted header will be stored on disk in encrypted format, using the objects fingerprint property as the encryption key.

The purpose of the owner flag is to indicate whether or not this token can be used to provision additional tokens for this object.  These deligate tokens can customized to allow a subset of the HTTP verbs allowed by the owner token.

I'm not sure if successive POSTs should be allowed.  Internally JSFS can support this (as-is, each post would create a new version of the object) but it seems like there's potentially harmful use-cases.  For example, client A posts an object to /foo/bar.json and receives an owner token.  Then client b posts an object to /foo/bar.json and receives an owner token.  Both objects are stored independently, but a request to /foo/bar.json will return the object stored by client b under the current configuration.

There's a number of conceivable ways to make this work, but it can create some confusing results so I'd want to know a strong real use case to support this behavior before adding the complexity.

Objects updated via PUT request create a new version of the object but retain the original fingerprint.

Object listings (directories) can be retreived by placing a "/" at the end of a url.  If no token is supplied, only a list of non-private objects will be returned.  If a token is supplied, and the token has the GET authorization for the specified url both private and non-private objects will be returned.  

If a url points directly to an object (as opposed to a container or endpoint) a single object will be returned.  If more than one object has been posted to this url the most recent version will be the one returned.  If a "/" is placed at the end of a url that points to a specific object it will return a list of versions of the object.  
