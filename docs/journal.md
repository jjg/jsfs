# JSFS 5 Dev Journal


## 01202025
Looks like I left myself a mess, where was I?

Cleaned-up some tests around the blockstore.  The world is a fucking mess today.

I *think* the blockstore works well enough to save a jnode file, maybe it's time to work on directories a bit so I can get the failing auth tests to pass?

OK, jnode is now Loading and Saving itself.

OK, now that we can create directory jnodes, back to working on directory-based auth.

Directory-based auth seems to be working?  The code is pretty messy but since my time is almost up I'm going to call it for now.

Since I have a couple of minutes maybe I can leave myself some notes for what's next.

Since directory I/O seems to work, maybe I can start working on the "subspace root"-based configuration stuff?

Actually now that I peek at the CI, I need to do something about these hard-coded paths because it's causing [test failures in CI](https://github.com/jjg/jsfs/actions/runs/12875688555/job/35897433725?pr=161#step:7:147).

I guess maybe that is related to the config stuff?  Maybe.


## 01192025
Can't fall back asleep so I thought about JSFS and came up with a few new/revised ideas.

### delegated auth
Instead of using a static, internal auth function, allow a jnode to point to an auth function stored as an executable file inside jsfs.  By default this is the current internal auth function, but it could point to a custom, user-defined functiom instead.  I think this could be a simple way to support things like oauth.

It means adding overhead to each call (the auth function would need to be resolved, loaded, executed, etc.) but I can imagine ways to optimize the "default" auth function if performace was more important to the applicatiom than custom auth.

> Of course this can't be implemented until X support is implemented so until then the internal auth module will continue to be developed.

### slorp mode
This has been discussed many times over the years but I want to codify it now because I think it's a fascinating use case.

With slorp enabled, jsfs can capture the content of any website and serve it by making a simple http request using the jspace name of the website.  For example:

https://.com.jasongullickson/about.html

returns the contents of https://jasongullickson.com/about.html even if that file wasn't previously stored in this jsfs instance.  It does this by first looking in the local store for a jnode for this file, and if one is not found, the server creates one and makes an http request to fetch the contents.  The contents are then stored in jsfs and returned to the client.  As a result, subsequent requests for this site are served directly from jsfs at much higher speed, and are also avaliable when the original site is unreachable. This is similar to a caching proxy, and has a number of practical uses.

The primary use is migrating a site to JSFS.  With slorp enabled, the site is crawled by making requests against the JSFS server.  When the craw is complete, the DNS for the site can simply be changed to point to the JSFS server and the migration is complete.

There are many other applicatioms for this feature, such as making replicas for avaliability or even offline use, or simply caching a site to reduce pressure on the origin and speed-up access.  This also is a way to rapidly build-out the blocks in thr blockstore, potentially increasing deduplication performance.

> Note: slorped files are always initially public, and inherit the root-root access key.


## 01172025
It's only been a few days since I wrote some functional code (as opposed to tests) here and I'm already feeling disconnected from what exactly needs to be done next; not a good sign.

I have a little time now and might have a few free hours coming in a few days, so let's see if I can put the needle back in the groove.

Let's start by tidying-up the test output, that should make it a little easier to see what is broken vs. what just doesn't exist yet.


## 01132025
Had a new idea for config, and it also solves the "static access keys" replacement problem.

I want to try moving the config into jspace, as part of the jnode that is stored at the absolute root of jspace.  So for example, if you look at the jspace path:

http://10.1.10.1/.com.jasongullickson.jsfs/about.html

The "/." after the IP address (I think...) would point to a special jnode file that would contain node configuration data in addition to the usual directory contents and access key.

This allows the configuration to be modified at runtime via the JSFS API like any other file stores in JSFS, while preserving the ability to create & modify the configuration from outside as well since jnodes are just json files.

> This also decides the config format going forward, its JSON.

This does mean that all JSFS 5 servers will have a "local storage" blockdriver since this "boot block" will need to be readable as the server starts-up, but it could be limited to startup/restart time if desired.  There's also the matter of deciding if this jnode gets copied/replicated/etc. to other persistence areas, etc. but those details can be worked-out once I'm sure this will work at all.

Part of this will also be adding a startup check that walks the operator through creating the config if none is found (maybe even via optional web interface), defining standards for where this jnode file is stored, maybe providing a command argument to pass a custom location (or complete jnode file?), etc.

There's a lot of interesting applications for this beyond basic configuration.  For example, it provides a means for a server admin to provision host/domains as adding them will require the root access key.  An admin could create the host's root directory using the root-root access key and then set the domain's root access key to something known by the domain's admin.


## 01112025
Had a few minutes to space so I'm just picking at adding some more test and notes to define what needs to be done.


## 01102025
It's the end of the mourning week (I know, it's never the end) and while I won't be able to work on this every day anymore I want to make at least one commit a week if not more.  I should take some time today to package this week's work up in a way that will be easy to pick-up and set-down when I have less time to work on it.

One thing I've noticed over this week is that an hour is the absolute minimum I need to make any progress at all, and really it's more like two hours.  Four hours seems to be the maximum single-session length before I start to slow down, so two-to-four hours is really the goal for scheduling future work sessions.

I'm almost afraid to simply "catalog" everything I can think of that is outstanding as it would be as overwhelming as it would be incorrect.  Another thing I've found working this week is that I've found a "grain size" in the work that lets me comfortably work through several generations of a component, making better choices as I go.  This is good for making progress and producing quality results, but it also means that what I thought I would do isn't always what I end-up doing, which means things like detailed TODO lists would just end up being wrong.

Instead maybe what I should do is finish laying-down the foundation for the most obvious things (the remaining verbs, etc.) so that when I wrap things up this week the branch should have at least a toehold for each essential component.

That's done with the exception of `config`.  I still don't know exactly how config should work.  In previous versions of JSFS it was a Javascript file, which I like but isn't the best way to go for various reasons I don't recall off-hand.  It could be JSON, but you can't put comments in JSON and it could be YAML, but I don't want to add a dependency just to use YAML so unless node.js can deal with YAML natively that's not an option.

I might just punt on config for right now.

Another thing I'd like to get setup before the end of the week is CI-ish stuff.  It would be nice to have tests and linting running automated in the repo.

Got a basic GA that runs the tests against the `main` branch and PR's:

https://github.com/jjg/jsfs/actions

Might add a linter too...

Linter added.  Weird note: I couldn't get it to ignore the `test` directory using the config, so I had to cram it into the command-line arguments in `package.json`.


## 01092025
I've been thinking about putting the [blockstore](./blockstore.md) on a separate thread/process in a way that it can be shared by all requests.  The reasoning is that it can run off it it's own corner of the computer and not block the main thread.  It also opens up the possibility of caching across requests/clients, and since it works at the block level this could provide a sort of *compute-level deduplication*.  Also having a very clean interface with the blockstore might make it easier to spin the blockstore out into a stand-alone program that could be run without the rest of JSFS on remote servers to support federation, replication, etc.

Anyway, back to the task at hand.

Yesterday I was able to load *something* via the blockstore's `Load()` method.  It was very juryrigged so that needs work.  I also need to get `Store()` working, and I think it makes sense to do that first so there's an automated way to write data before continuing work on reading it.

Getting `Store()` to work was a matter of using an easier API than where I started.  

Now that I'm seeing more of how this will be wired-up I wonder if it could be as simple as not having the verb handler `await` the call to the `blockstore`?  This would allow the verb handler to complete the client request without waiting for the data to be persisted and cleanly delegates things like raid, retry, etc. to the blockstore.  However if some unrecoverable problem occurs writing the block there's no way to tell the client, so there will have to be another way, maybe by writing something to the `jnode` to indicate corruption status?

Not sure how best to handle that but I want to design this with the idea that each component/module can trust the others to do there job, so a verb handler should be able to trust that the blockstore will store a block one way or another, and that when called upon to retrieve the block, it will do so unless it's completely impossible (in which case what is the verb handler going to do anyway?).  This encourages module autonomy and prevents exception handling from leaking across module boundaries.

The only thing I don't like about this is that I think it forces the block naming (hashing the block data to generate a name) back into the verb handler, which feels less clean.  Hmm...

I decided to move block hash/name generation out of the blockstore so `Store()` can be called w/o `await`ing the result.


### References
* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
* https://nodejs.org/docs/latest-v22.x/api/webstreams.html#class-readablestream


## 01082025
After thinking about it overnight I'm not going to do anything clever with directory files and will instead treat them like any other for now.  Maybe I'll move the data into the jnode at some point as an optimization, but for now they will get treated like any other file.

This does mean that I have a chicken-and-egg problem with implementing the parts of `auth` that use directories so that will have to get parked until I've written enough of the "write" verbs to write out some directories.

So what does that mean for *what's next*?

I think it means it's time to start implementing `POST`.  

```
client -> index.js -> post.mjs -> blockstore.mjs -> blockdrivers 
```

Once I started implementing `POST` it became clear that I should probably pass the request and response to each verb handler and just let them set the HTTP status, etc.  This is essential for verbs that stream data, so why not make the interface consistent?  I'm still not sure if each verb method should return anything at all because I'm not sure how that would change the main loop, so I left a note and will revisit that later.

I also changed `blocks` back to an array; I had changed it to an object because I've always worried that the order of an array might change but according to the docs I can find ES6 treats arrays as objects so this isn't likely to happen.  AFAIK it's never been a problem in any previous version of JSFS, so I'll leave it as an array for now and do some additional testing to see if I can break it.

Added initial tests (and some implementation) for `HEAD`, `GET`.

> Reminder: use `let` instead of `var`, etc.

OK, it's time to make the fake `req` (`IncomingMessage`) I'm using in the tests behave more like the real thing.

I thought there might be some examples of this on the web, but the answer is always to use some third-party module.  I'd rather understand how this works and learn something, so I'm going to see what I can do myself before reaching for some random code that I'm going to have to evaluate introduce more dependencies/risks/etc.

`http.IncomingMessag` extends `stream.Readable` so maybe I can just do that to get what I need?

As I dig into this I'm reminded that there's two types of stream in Node.js, the "original" and "WebStream".  I want to stick to the latter as it should be more like the rest of the web.

So far so good.

Now that I'm implementing some of the `Post` module I'm going to have to decide where the line is between the `Post` verb handler and the `blockstore` (and additionally, `blockdriver`(s)).

OK, I'm passing a file from a test to the `Post` handler, and the handler is parsing the stream and adding block names to the `jnode`.  It's not persisting any data yet, but I'll probably save that for tomorrow since it will involve starting work on the `blockstore` and that's a bit more than I'm ready to bite off today.

I had a little more time today to think about the blockstore/blockdriver bits.  One change I've had in mind is to consolidate all persistence via the blockstore so that both jblocks and jnodes are stored the same way.  In previous versions of JSFS these were separate, which made things complicated when moving beyond local disk-based blockstores.

So the blockstore should have a simple two-method interface; one to store a jblock/jnode and one to retrieve them.  Hmm...  


### References
* https://stackoverflow.com/questions/34955787/is-a-javascript-array-order-guaranteed
* https://stackoverflow.com/questions/28152740/how-to-make-empty-placeholder-tests-intentionally-fail-in-mocha
* https://nodejs.org/docs/latest-v22.x/api/http.html#class-httpincomingmessage
* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
* https://nodejs.org/docs/latest-v22.x/api/stream.html#readable-streams
* https://nodejs.org/api/buffer.html#static-method-bufferfromarraybuffer-byteoffset-length


## 01072025
I thought of a few things I overlooked overnight.  The first is that I need to make sure that expired tokens are not authorized and also, there might be a way to eliminate the extra `expires` parameter when using a temporary token.

I think I can also clean-up some of the method handling code by moving param extraction into the `utils` module, and I have an idea for supporting clients that can't use the "custom" methods as well.

New temporary token implemented (no more `expires` param!), param extraction moved to the `util` module and all token-related tests passing!

So what's next?

Could be implementing enough of the directory logic to get the two remaining `auth` tests to pass (crawling the jspace for keys), or could be adding the method override parameter (easier, but not as important right now).

It would be cool to have passing tests, and the directory thing is more interesting (maybe the verb thing isn't even a problem?).

This is fairly complex and might not even be possible until I implement more of the underlying I/O code (blockstore, etc.).  There's also the question of treating jnodes for directories differently from other files.  I've considered writing directory data (file listing, etc.) directly into the jnode instead of into individual blocks.  The upside of this is that it simplifies directory I/O (we can simply load the jnode and skip loading blocks) but it has the downside of limiting directory size to the size of a single block (jnodes are stored in a single block).  It also creates a somewhat special case for this data instead of being consistent across all types of data stored in JSFS.  

The only real reason I'm considering this is that if the data is stored like everything else that means that directory lookups will need to go through the blockstore and blockdrivers, potentially generating an HTTP request for every directory lookup.  If there a very deep jspace with no directory files but the root, this could result in a *lot* of http requests.

I also just remembered that `auth` needs to differentiate between `public` and `private` files...


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
