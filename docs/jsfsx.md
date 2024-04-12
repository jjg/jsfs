# jsfsx

"The simplest thing that could possibly work."

## TODO (in no strict order)
- [x] Add executable flag
- [x] Execute executable files on GET
- [x] Fix duplicated output error
- [ ] Standardize i/o interface (`x_in`, `x_out`, etc.)
  - [ ] Expose some/all request input to the executing code
- [x] Refactor (code structure, logging, error handling, etc.)
- [ ] Experiment with `vm` settings to maximize stability, performance, security
- [ ] Execute executable files on POST
- [ ] Come up with a way to fetch the source of an executable w/o running it
- [ ] Preserve `executable` bit through `PUT`s (note: this might impact other properties...)

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


## References
* https://nodejs.org/api/vm.html
* https://nodejs.org/docs/latest/api/stream.html#stream_implementing_a_transform_stream
