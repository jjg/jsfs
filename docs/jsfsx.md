# jsfsx

"The simplest thing that could possibly work."

## TODO (in no strict order)
- [x] Add executable flag
- [x] Execute executable files on GET
- [x] Fix duplicated output error
- [x] Standardize i/o interface (`x_in`, `x_out`, etc.)
  - [x] Expose some/all request input to the executing code
- [x] Refactor (code structure, logging, error handling, etc.)
- [ ] Experiment with `vm` settings to maximize stability, performance, security
- [ ] Execute executable files on POST
- [x] Come up with a way to fetch the source of an executable w/o running it
  - [x] Don't execute if an access-key/token is presented
- [ ] Preserve `executable` bit through `PUT`s (note: this might be an existing bug, other properties appear to behave the same way...)
- [ ] Figure out how to set the `content-length`, `content-type` headers when executing code
- [ ] Consider finding a way for a client to access `x_err` data (maybe a `debug` flag that dumps the entire context to `response`?)
- [ ] Consider the impact of executables that emit large amounts of data (or continuous streams)

## curl to store an executable file
```bash
curl -X POST -H "content-type: text/javascript" -H "x-access-key: jjg" -H "x-executable: true" --data-binary @hello.js "http://localhost:7302/bin/hello.js"
```

### result
```json
{
  "url": "/localhost/bin/hello.js",
  "created": 1712694738665,
  "version": 0,
  "private": false,
  "encrypted": false,
  "fingerprint": "438754d26cf1daaf69f9a0e6421b3053e4c00f75",
  "access_key": "jjg",
  "content_type": "text/javascript",
  "file_size": 33,
  "block_size": 1048576,
  "blocks_replicated": 0,
  "inode_replicated": 0,
  "blocks": [
    {
      "block_hash": "a3b622a18ce02eb4d6e609f842964f430325e3d4",
      "last_seen": "./blocks/"
    }
  ],
  "executable": true,
  "media_type": "unknown"
}
```

## flow
```
case "GET"
send_blocks()
load_from_last_seen(true)
read_file()
read_stream = operations.stream_read(path)
read_stream.pipe(unzipper).pipe(decryptor).pipe(res)
on_end()
read_stream shutdown
send_blocks() (until all blocks are sent)
- or -
search_for_block(0)
read_file()
```

## it works!

### source file
`hello.js`
```javascript
x_out = "Hack the Planet!";
```

### upload
```bash
curl -X POST -H "content-type: text/javascript" -H "x-access-key: jjg" -H "x-executable: true" --data-binary @hello.js "http://localhost:7302/bin/hello.js"
```

### execute
```bash
curl "http://localhost:7302/bin/hello.js"
```

### output
```bash
Hack the Planet!Hack the Pla
```

There's clearly bugs, but I think it proves the concept.

```bash
curl -v "http://localhost:7302/bin/hello.js"
*   Trying 127.0.0.1:7302...
* Connected to localhost (127.0.0.1) port 7302 (#0)
> GET /bin/hello.js HTTP/1.1
> Host: localhost:7302
> User-Agent: curl/7.81.0
> Accept: */*
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
< Access-Control-Allow-Headers: Accept,Accept-Version,Api-Version,Content-Type,Origin,Range,X_FILENAME,X-Access-Key,X-Access-Token,X-Append,X-Encrypted,X-Private,X-Replacement-Access-Key,X-Requested-With,X-Executable
< Access-Control-Allow-Origin: *
< Access-Control-Expose-Headers: X-Media-Bitrate,X-Media-Channels,X-Media-Duration,X-Media-Resolution,X-Media-Size,X-Media-Type
< Content-Type: text/javascript
< Content-Length: 28
< Date: Thu, 11 Apr 2024 15:50:10 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
< 
* Excess found in a read: excess = 4, size = 28, maxdownload = 28, bytecount = 0
* Closing connection 0
Hack the Planet!Hack the Pla
```

## Refactoring and bugs

For whatever reason refactoring the code a bit made the duplicate output bug go away ("IT'S MAGIC!").  Now executable `GET` requests work as expected, so it's probably time to think more about the interface between requests, reponses and the executable code.

It's tempting to move on to `POST` but probably better to figure out the I/O first..


## input

Let's start by passing the whole `request` into the executor, what's the worst that can happen?

Then this uploaded code:

```javascript
x_out = "The request method is: " + x_in.method;
```

...yeilds this result:
```bash
curl "http://localhost:7302/bin/input.js"
The request method is: GET
```

## X runtime environment/interface

There will be a lot more to explore here in the future, but in the spirit of MVP or whatever here's what we're going to do for now.

Files marked executable are run as Javascript in a [Node.js VM](https://nodejs.org/api/vm.html#vm-executing-javascript).  At startup three variables will be initialized: `x_in`, `x_out` and `x_err`.  These map loosely to the `stdin`, `stdout` and `stderr` unix convention.
* `x_in` is the entire `request` object sent by the user agent (for now)
* `x_out` is returned to the user agent in the `response` object
* `x_err` is written to the JSFS log

It would be useful if `x_err` was more accessible by the user agent, and I have some ideas for this (maybe a `x-jsfs-debug` header that dumps the entire `context` to `response`?), but for now I'm just going to let it write to the log (if it's needed for debugging you can always do that using a local JSFS instance right?).

## view source
Now you can retrieve the data (as opposed to executing the code) in a stored file that is marked as executable:

```bash
curl "http://localhost:7302/bin/viewsource2.js"
Call me with an access-key to view my sourcecode!

curl -H "x-access-key: jjg" "http://localhost:7302/bin/viewsource2.js"
// If you're seeing this, the execute override worked!
x_out = "Call me with an access-key to view my sourcecode!";
```

## References
* https://nodejs.org/api/vm.html
* https://nodejs.org/docs/latest/api/stream.html#stream_implementing_a_transform_stream
