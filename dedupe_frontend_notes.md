Changes to reduce bandwidth utilization by sending only unique blocks to the storage server.

Server-side:
*  new "store block" endpoint
*  new "store metadata only" POST method

Client-side:
*  new storage type that specifies a remote storage server
*  method to store blocks remotely
*  method to POST metadata only to remove server

JSFS is installed locally on the client machine.  A new configuration section called `PEERS` is added which points to the remote storage server: 

```
PEERS:["https://jsfs.domain.com"
]
```

(note: the STORAGE_LOCATIONS array should be left empty to avoid storing blocks locally as well)

When files are `POST`ed to this local instance, the following steps occur:

1.  Blocks are `POST`ed to the configured server's `/_bs` endpoint
2.  The server rejects blocks that already exist (just like any `POST` to an existing path)
3.  When the file is closed, the new file metadata is `POST`ed to the server at the same path that was `POST`ed to the local instance, but with the `X-Metadata-Only` header set
4.  The server adds the new file metadata to it's Superblock

At this point the new file is avaliable via `GET` request from the server.






