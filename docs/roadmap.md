# Roadmap

Future work.

## Update-to-date

Bring the current implementation up-to-date in terms of code, structure, modularity, packaging and testing.  

Surface existing but undocumented (or unexplained) features such as the namespace, maintenance, advanced configuration.

Make default configuration secure and private without increasing complexity.


## JSFS+S

Complete websocket experiments and make the websocket interface part of the standard API.


## JSFS+SX

Extend file storage to file execution.  Supported file types stored with a new "execute" parameter set are executed by JSFS when requested by a client (akin to AWS Lambda or Google Cloud Functions).  This allows applications to be built on JSFS that include both client and server code.


## Federated JSFS+SX

Replace JSFS's inodes with a distributed hash table allowing a group of JSFS nodes to service requests for data and processing distributed across all nodes.  

When a client request is received, the receiving node fulfills the request on its own if possible, if not it transparently collects the requested data from other nodes and delivers it to the client.

If execution is requested, JSFS can parallelize the task across multiple nodes if requested, potentially moving processing tasks to execute locally where the data to process is stored, minimizing the need to move unprocessed data across the network.

Finally, the node contacted by the client caches any transfered data (raw or processed) to speed-up subsequent requests and provide data redundancy as well.

Three protocols will be developed to support federation: metastore, blockstore and proc.  

### Metastore

This protocol is used to exchange file metadata in the form of a distributed hash table.

### Blockstore

This protocol is used to transfer blocks of data between nodes in a federation.

### Proc

This protocol is used to start, stop, migrate or otherwise interact with processes being run by clients across federated nodes.

Full JSFS+X servers implement all three protocols as well as the HTTP API interface ised by clients.  Utility or special-purpose servers can also participate in federation by implementing one or more of these protocols, and may be implemented in any technology capable of meeting the protocol specification.


## Local JSFS+SX

To minimize network-induced latency, a local instance of JSFS is run in federation mode.  As a result, applications run from the local instance and incur zero network latency after initial load.  

Processing also occurs locally unless the source data is not local or additional processing power is requested.

Additionally, name resolution is handled by JSFS using the distributed hash table so the need and latency of DNS lookups are eliminated.

In this mode, each user's machine serves as an node in the federation, eliminating the *need* for traditional servers (although such servers may still be used to provide redundancy or access to applications from clients that are unable to run a local server).
