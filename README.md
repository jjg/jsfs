# JSFS

An [operating system for the web](https://jasongullickson.com/an-operating-system-for-the-web.html).

## TODO (in no particular order):

- [X] Add license
- [ ] Add API to README
- [ ] Figure out `config`
- [ ] Add config to README
- [X] Document `jspace` in README
- [ ] Write `jnode`
- [ ] Write `verbs`
- [ ] Write example `blockdriver`
- [ ] Write example `metadriver`
- [ ] Re-write [jedi](https://github.com/jjg/jedi)
- [ ] Setup repo automation (tests, lint, releases, etc.)
- [ ] Clean-up Tasks

## Usage

### Run tests
```bash
$ npm test
```

### Start the server
```bash
$ npm start
```

## API

> Lots TODO here, right now just some examples.

### Examples

#### HEAD request missing required auth info
```bash
$ curl -v -X HEAD -H "x-jsfs-access-key: baz" http://localhost:7302
*   Trying 127.0.0.1:7302...
* Connected to localhost (127.0.0.1) port 7302 (#0)
> HEAD / HTTP/1.1
> Host: localhost:7302
> User-Agent: curl/7.81.0
> Accept: */*
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 403 Forbidden
< Date: Tue, 31 Dec 2024 17:06:04 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
* no chunk, no close, no size. Assume close to signal end
< 
* Closing connection 0

```

#### HEAD request with valid auth info
```bash
$ curl -v -X HEAD -H "x-jsfs-access-key: baz" http://localhost:7302
*   Trying 127.0.0.1:7302...
* Connected to localhost (127.0.0.1) port 7302 (#0)
> HEAD / HTTP/1.1
> Host: localhost:7302
> User-Agent: curl/7.81.0
> Accept: */*
> x-jsfs-access-key: baz
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< x-jsfs-version: 0
< Date: Tue, 31 Dec 2024 17:05:21 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
* no chunk, no close, no size. Assume close to signal end
< 
* Closing connection 0
```

## Features

### jspace
Internally, JSFS uses a URI format called `jspace`.  This provides two neat features:

* By pointing a `A`, `AAA` records (or just your hostfile) at a JSFS server, any requests made using that record will automatically be "namespaced"
* These namespaces can be accessed *without DNS or other name resolution*

For example, I can point a DNS record for `jsfs.jasongullickson.com` as well as a DNS record for `files.mystuff.com` at the same JSFS server, and if I `POST` a file to `http://jsfs.jasongullickson.com/about.html`, `http://files.mystuff.com/about.html` will be untouched.

If I want to access each of these files without relying on DNS or other name resolution, I can provide the `jspace` path via a request to *any name or address that points at the JSFS server*.  For example:

``` bash
$ curl http://10.1.10.1/.com.jasongullickson.jsfs/about.html
```

Will return the same file as `http://jsfs.jasongullickson.com/about.html` whereas:

```bash
$ curl http://10.1.10.1/.com.mystuff.files/about.html
```

Will return the same file as `http://files.mystuff.com/about.html`.

Aside from removing the overhead of normal name resolution, applications using `jspace` paths makes them immune to DNS hacks or DDOS attacks on DNS servers.


### Keys and Tokens
Two parameters can be used to gain access to files in JSFS: `access-key` and `access-token`.  A valid `access-key` can be used for any operation (`GET`,`POST`, etc.) forever as long as it matches the `access-key` of the file (or in the case of new files, the nearest directory).  

For more precise control, or to provide access for a limited amount of time, an `access-token` can be created.  `access-token`s are method-specific and can also be made to expire.

To generate an `access-token`, hash the `access-key` + method using SHA1:
```js
import crypto from 'node:crypto';

const key = '077785b5e45418cf6caabdd686719813fb22e3ce';
const method = 'GET';
const token = crypto.hash('sha1', key + method);

console.log(token);
```

The output is then passed as `access-token` instead of `access-key`.

To create a temporary token, include a the expiration datetime in [Unix time](https://en.wikipedia.org/wiki/Unix_time) format:
```js
import crypto from 'node:crypto';

// This token expires 6 hours from now.
let d = new Date();
d.setTime(d.getTime() + 6 * 60*60*1000);

const key = '077785b5e45418cf6caabdd686719813fb22e3ce';
const method = 'GET';
const expires = `${Math.floor(d.getTime() / 1000)}`;
const hash = crypto.hash('sha1', key + method);
const token = `${hash}${expires}`;

console.log(token);
```

When using a temporary token the expiration datetime must be included in the request as the `expires` parameter.

