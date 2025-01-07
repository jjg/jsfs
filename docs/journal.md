# JSFS 5 Dev Journal

## 01072025
I thought of a few things I overlooked overnight.  The first is that I need to make sure that expired tokens are not authorized and also, there might be a way to eliminate the extra `expires` parameter when using a temporary token.

I think I can also clean-up some of the method handling code by moving param extraction into the `utils` module, and I have an idea for supporting clients that can't use the "custom" methods as well.

New temporary token implemented (no more `expires` param!), param extraction moved to the `util` module and all token-related tests passing!

So what's next?

Could be implementing enough of the directory logic to get the two remaining `auth` tests to pass (crawling the jspace for keys), or could be adding the method override parameter (easier, but not as important right now).




## 01062025
Dad passed away last time I was working on this.  Taking me a few minutes to figure out where I left off...

Looks like there's some failing `auth` tests, so that's as good a place to start as any.

Added a bunch of `not implemented` tests as placeholders for things `auth` should (or shouldn't) do.  Also started documenting keys and tokens in the new README.

Something I'm reconsidering is the use of SHA1 for token generation (and elsewhere).  It's no longer considered secure, but I'm not sure if that matters.  We're not really using it for security, only to generate collision-resistant hashes, so maybe it's OK to keep?  Keeping it ensures backward-compatibility, and using something more secure is probably going to be more resource-intensive (although I should verify this).  Something to think about...

I also decided that we're going to use directories to replace `STATIC_ACCESS_KEYS`.  I think it can be as simple as creating a "root" directory, maybe I'm wrong, and if so we change it later.

Got keys and tokens essentially done, still need to flesh-out the verb-specific token tests but I think this is enough for today.


### References
* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
* https://nodejs.org/api/url.html#class-urlsearchparams


## 12312024
Beginning to flesh-out `auth`.  This now depends on the concept of `directory`, so I might give some more thought to that (or just stub around it for now).

This also brings-up the issue of `STATIC_ACCESS_KEYS`.  This is something  just added to JSFS and allows the administrator to configure keys that will be used when there's no existing `jnode` for a file.  This is a simple "locking" mechanism preventing writes from unknown clients.  I think this should be preserved but I'm not sure if it should still be a configuration-level thing or if it could leverage the new `directory` abstraction?

For example, instead of a config value, an admin could `POST` a "root" `directory` to a newly-configured host, effectively establishing a static key for every subsequent write to that hostname.  Since establishing a new host *kinda* requires DNS changes (pointing an `A` or `AAA` record at the JSFS server) it has similar authority to storing these keys in the config.  Of course this isn't completely true, because a `jspace` path can always be used to write to a host-specific path without DNS configuration so... I'm not sure.

Maybe we start with this and think about ways to address the `jspace`-path loophole as it would be a lot more elegant if we can get everything we need from the `directory` construct.

I found a simple way to stub the `req` passed-in to `auth` that I'll use to write tests for the verbs as well.  It feels hacky but doesn't add any dependencies so I'll just run with it for now.

Also fixed a failing test in `jspace` calculation and added some docs around `jspace` to the README.

Got `auth` working in the server, and added some `curl` examples to the README.


## 12302024
After overthinking it, I'm just going to pass the whole request object around.

I'm calling the "jsfs address" `jspace` now.  I don't love this name, but I just got tired of having to re-describe it.  I also corrected the formatting of it in earlier journal entries.

I've established something of a pattern for invoking the verbs.  I'm passing the `jnode` and the `res` object in to all verbs, and the `req` as well for verbs that will consume data from the client (`POST`, `PUT`, etc).  Each verb will be responsible for handling exceptions and setting the HTTP status if something weird happens while they're in control.  This feels heavy-handed, and is going to make writing tests harder, but it will work and should make streaming data easier.

Server is handling it's first requests tonight.  It's just a `HEAD` request, and the results are pretty much rigged, but it at least demonstrates the verb calling pattern.  There's no automated test for the `head` module yet, I'll leave that for another time when I have more energy.

I've also added two new verbs (`MOVE`, `COPY`) which will be used to implement zero-op data copying (essentially adding a new inode pointing to existing blocks).  This is going to be like `EXECUTE` in that we'll come up with some way to trigger these using "normal" HTTP verbs with some header/etc. for clients that can't specify non-standard verbs.

I've made breaking changes to the format of the `jnode` JSON.  I think this is the right thing to do, but I'll have to add support for backward-compatability to live-up to the commitments I've set earlier.  I think this will simply be a matter of additional logic in the `Jnode.Load()` method to detect pre-v5 `inode`s and mapping them into v5 `jnode`s in memory.  This way they are simply left untouched for read operations and will be upgraded automatically during writes.


## 12262024
Added license.

Also decided that I'm going to commit to committing *something* to this project at least once a week in 2025.

Added a bunch of docs for capturing ideas as they come.


## 12252024
Add readme and lots of TODO's.


## 12242024

Setting up the repo and moving some of the sketching-out from below into the code.

There's a lot to decide.  I'm going with [mocha](https://mochajs.org/) for testing but I'm being careful to avoid adding any external dependencies to the production build.  I'm also going with [es6](https://nodejs.org/api/esm.html) style modules, hopefully that works with any Blockdriver dependencies.

Turns out that there is some tweaking to do to use ES6 modules, and this tripped me up setting up some initial tests.

### References
* https://nodejs.org/api/esm.html
* https://mochajs.org/#installation
* https://www.naukri.com/code360/library/native-es-modules-in-mocha
* https://mocha-docs-next.netlify.app/explainers/nodejs-native-esm-support/


## 12232024

This is going to be a rambling description of JSFS3.

There will be a few breaking changes to the existing JSFS API, but I don't think they will be missed (the removal of `encrypted` and `compressed` blocks).  Otherwise there should be no breaking API changes, and existing JSFS pools should be mountable (this backward compatibility is configurable).

Here's a high-level description of how each method works.

### GET
1. Compute JSFS address
2. Load jnode
3. Auth
4. Stream data from Blockstore


### POST
1. Compute JSFS address
2. Load jnode
	+ If jnode exists, return error
3. Auth
	Check for directory permissions
3. Stream data to Blockstore
5. Analyze blocks with Metadatadriver(s)
4. Write blocks to Blockdriver(s)
5. Create new jnode
6. Update directory

### PUT
1. Compute JSFS address
2. Load jnode
	+ If jnode doesn't exist, return error
3. Auth
3. Stream data to Blockstore
5. Analyze blocks with Metadatadriver(s)
4. Write blocks to Blockdriver(s)
5. Create new jnode
6. Version previous jnode

### DELETE
1. Compute JSFS address
2. Load jnode
3. Auth
4. Create new jnode marked deleted
5. Version previous jnode
6. Update directory

### HEAD
1. Compute JSFS address
2. Load jnode
	+ if jnode doesn't exist, return error
3. Auth(?)
3. Return metadata

### EXECUTE
1. Compute JSFS address
2. Load jnode
	+ if jnode doesn't exist, return error
3. Load blocks into Buffer from Blockstore
4. Execute code in Buffer
5. Stream the output of the running code 


### JSFS Address (jspace)
Incoming requests are parsed into a JSFS path which is a reverse of the hostname plus the rest of the path.  For example:

`http://jasongullickson.com/about.html`

becomes:

`/com.jasongullickson/about.html`

JSFS uses these paths internally to allow a JSFS instance to represent any valid DNS name without relying on DNS.

The JSFS Address is a hash of this path.  This hash is used to name the jnode which stores the metadata and block map for each file stored in the filesystem.


### Jnode
A new jsfs-specific name for inodes.  Stored in a subdirectory based on the first 8 chars of the jnode filename with an extension of `.json`.

During write operations Jnodes are written to all writable Blockdrivers for redundancy.

When an exsting JSFS pool is mounted, the existing inodes will be used for Read operations.  When Writes occur, the original inodes will be replaced with versioned Jnodes in the Jnode directory structure.  This backward-compatibility feature can be disabled to improve performance.


### Jblock
A Jblock is a piece of a stored file, named using a hash of the data the block contains.  Block length is configurable.  The block length establishes the maximum size of a jnode as jnodes are written as a single block.  Blocks are stored in subdirectories named for the first eight bytes of the block's name.  Block files have the extension `.jblock`.

When an existing JSFS pool is mounted, the original blocks will be unchanged for Read operations, but new blocks will be written as `.jblock` files into an appropriate directory structure.  This backward-compatibility mode can be disabled to improve performance.


### Auth
Auth accepts a jnode (or `null`), an Access Token or Access Key.  It returns a boolean indicating if the request is allowed or not.  If a jnode is provided, Auth will use permissions data from the jnode to decide if the request is authorized.  If no jnode is provided, Auth with walk the path backwards searching for Directory files (`/`) and use the first one found to check permissions.  If no directory files are found, Auth will look for a "global" key, and if no global key is found the request will be allowed.


### Blockstore
The Blockstore is used to store and retrieve files.  For storage it receives a stream of incoming data and a Blockdriver configuration.  The Blockstore cuts up the stream into individual blocks, hashes the block data to generate a name used to store the block and then stores each block using the configured Blockdrivers.  Retrieval works in reverse, the Blockstore is presented with a jnode and returns a stream of data composed of the blocks associated with the jnode.  The Blockstore queries the configured Blockdrivers in parallel to assemble the stream as quickly as possible and begins returning data as soon as blocks are avaliable in the correct sequence.

When storing data, the Blockstore will only attempt to write blocks to Blockdrivers configured as Write or Write Only.  When retriving data, the Blockstore will start with Blockdrivers configured for Write access, then move on to Read and Read Only drivers.

> What about stripe vs. mirror?  I'm tempted to ignore this and delegate concerns of redundancy to the Blockdrivers themselves.


### Blockdriver
A Blockdriver loads and stores individual Blocks.  A given instance of JSFS can be configured with several Blockdrivers and each driver can be configured individually for Read, Write, Read Only or Write Only operation.  Each Blockdriver must provide a method to `save(block)` and `load(block)` blocks, as well as any driver-specific settings.


### Metadatadriver
Metadatadrivers can be configured to analyze files as they are being stored and add metadata to the file's Jnode.


### Versioning
File versioning is provided by preserving the existing copy of a Jnode when the file it represents is updated.  During `PUT` the original Jnode is stored under a new name indicating the version of the file it represents, and the `version` property of the new Jnode is an increment of the `version` property of the previous Jnode.  Versions are who integers and the `version` property is initialized to `1` when a file is created.

The naming convetion for previous Jnodes is the Jnode name + `_v2` where `2` is the version.  To access previous versions of the file, a `x-jsfs-version` header or `jsfs_version` querystring parameter is added to the request.


### Execute
The `EXECUTE` verb will attempt to execute a file stored at the specified path.  The file must be marked as executable, and be a valid Javascript or Webassembly.  The output from the executing file will be streamed back in the response.  For convinience, the verbs `GET`, `POST` and `PUT` can also execute executable files (some clients may not be able to specify the `EXECUTE` verb) but I'm not exactly sure how we want to trigger this yet.


### Proc
The `/proc` path is used to access hardware resources on the JSFS host.  It can be used to query or alter the host operating system or to access hardware-specific resources like GPIO, battery levels, etc.  It is only accessible via the `.localhost` path, which limits access to console access or executable files running under JSFS.


### Etc
The `/etc` path provides access to the running configuration of JSFS.  `/etc/jsfs.config` allows things like Blockdriver configuration to be changed without restarting the service.  It is only accessible via the `.localhost` path.


### Directories
Directories `/` are JSON files stored like any other file.  When a file is accessed the target path is traversed in reverse order searching for directory files.  If one is found, it is queried for permissions which are then used during the Auth step to determine if the access is granted.  Directories also contain an array of files stored under the path the directory file is stored in.  This array is maintained automatically by JSFS, and can probably be modified manually if permissions allow it.

Directories use the same permissions as files (`public`/`private`) and are created with `public` permissions by default.  A `public` directory can be viewed by anyone, a `private` directory can only be viewed by providing a valid Key or token.  Modifying any directory directly requires a Key or Token for that directory, but JSFS will update a directory automatically if files contained within the directory are modified (which of course requires a valid Key or Token).


### ROMs
ROMs are read-only packages of Blocks & Jnodes that can easily be added to any JSFS instance to make data and applications avaliable.  It requires no real changes to JSFS, just a specified way to identify a range of files to export as a ROM (maybe just a path?) and a way to add them to another instance (maybe as a part of storage configuration or just another type of Blockdriver?).  

The primary application I have in mind for ROMs are complete applications (like Jedi) or shared Javascript libraries, etc.


### Jedi
Jedi is a web-based editor designed to work with JSFS.  Among other things it makes writing applications on JSFS easy and can be used to modify JSFS itself.   
