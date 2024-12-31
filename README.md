# JSFS

An [operating system for the web](https://jasongullickson.com/an-operating-system-for-the-web.html).

## TODO (in no particular order):

- [X] Add license
- [ ] Add API to README
- [ ] Figure out `config`
- [ ] Add config to README
- [ ] Document `jspace` in README
- [ ] Write `jnode`
- [ ] Write `verbs`
- [ ] Write example `blockdriver`
- [ ] Write example `metadriver`
- [ ] Re-write [jedi](https://github.com/jjg/jedi)
- [ ] Setup repo automation (tests, lint, releases, etc.)
- [ ] Clean-up Tasks

## Usage

### Run tests
```
npm test
```

### Start the server
```
npm start
```

## jspace
Internally, JSFS uses a URI format called `jspace`.  This provides two neat features:

* By pointing an `A` or `AAA` record at a JSFS server, any requests made using that record will automatically be "namespaced"
* These namespaces can be access *without DNS or other name resolution*

For example, I can point a DNS record for `jsfs.jasongullickson.com` as well as a DNS record for `files.mystuff.com` at the same JSFS server, and if I `POST` a file to `http://jsfs.jasongullickson.com/about.html`, `http://files.mystuff.com/about.html` will be untouched.

If I want to access each of these files without relying on DNS or other name resolution, I can provide the `jspace` path via a request to *any* name or address that points at the JSFS server.  For example:

``` bash
> curl http://10.1.10.1/.com.jasongullickson.jsfs/about.html
```

Will return the same file as `http://jsfs.jasongullickson.com/about.html` whereas:

```bash
> curl http://10.1.10.1/.com.mystuff.files/about.html
```

Will return the same file as `http://files.mystuff.com/about.html`.

Aside from removing the overhead of normal name resolution, applications using `jspace` paths makes them immune to DNS hacks or DDOS attacks on DNS servers.


