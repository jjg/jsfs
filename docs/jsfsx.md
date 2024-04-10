# jsfsx

"The simplest thing that could possibly work."

## TODO
[x] Add executable flag
[] Execute executable files on GET
[] Execute executable files on POST

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


## References
* https://nodejs.org/api/vm.html
