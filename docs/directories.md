# add directory support

The idea is simple: treat a trailing `/` as a file that contains directory information.  Let's walk through this...

This stores a new file containing a little bit of JSON at the path `/foo/bar`:

`curl --header "x-access-key: jjg"  --header "Content-Type: application/json" --request POST --data '{"foo":"bar"}' http://localhost:7302/foo/bar`

`curl http://localhost:7302/foo/bar` returns `{"foo":"bar"}`


So what does this store?
`curl --header "x-access-key: jjg"  --header "Content-Type: application/json" --request POST --data '{"files":["bar"]}' http://localhost:7302/foo/bar/`

`curl http://localhost:7302/foo/bar` returns `{"files":["bar"]}`

But what happened to `/foo/bar`?

`curl http://localhost:7302/foo/bar` still returns `{"foo":"bar"}`

So JSFS already treats a trailing `/` as a distinct file.  With an intelligent client I think we can use this alone to add directory support.

## Example

### Storing a file

1. `GET /foo/`
2. Parse the JSON returned
3. Add `bar` to the `files` array
4. `POST` the new file data to `/foo/bar`
5. `PUT` the updated directory JSON to `/foo/`

### Viewing a directory

1. `GET /foo/`
2. Parse the JSON returned
3. Select the `files` array from the JSON
4. Enumerate the array to display a list of files stored under the `/foo/` directory

## Applying this to the randos problem

So this is cool and all but does it solve the important problem?  Well we never even stated the problem so let's start there.

The problem that started this is that anyone with network access to a JSFS instance can upload files to any unused path.  On the modern Internet, this means that a lot of weird random shit gets stored (i.e. attempts to hack JSFS as if it were Wordpress results in files getting written) in JSFS instances that are on the public Internet.  This isn't dangerous per-se, but it wastes storage space and is generally gross.  The solutions to this that I've come up with so far detract from JSFS's elegance and user experience, so I haven't done anything about it yet, but this directory idea might have some potential.

OK, back to directories.  So what if we used the JSON in these `/` files to provide access control?  This is already possible on the client-side in the same way that directory file listing was described above, but if it's not enforced by the server it's simple to side-step any client logic.  But if we're going to modify the server to enforce this, how do we do that without doing anything gross?

Let's start simple and see what goes wrong.

### TSTTCPW

Contents of `/foo/`:

```
{
  "access_key":"jjg",
  "files":["bar"]
}
```

Then let's say we try to `POST` a new file to `/foo/baz`:
`curl --header "x-access-key: jjg"  --header "Content-Type: application/json" --request POST --data 'l33t haxor haxored you!' http://localhost:7302/foo/baz`:

What does the server do?

1. Parse JSON stored at `/foo/` (the last `/` before the new file path)
2. Check the `access_key` property of the JSON against the key/token provided by the request
3. If the key check fails (which it would with the example request above), deny the request

Reusing `access_key` here gives us the same amount of access flexibility (public, private, read, write) as any other file in JSFS, supports the same access methods (full-control with an `access_key`, temporary control with an `access_token`) and minimizes the amount of changes needed to the server.

> Security note: the `access_key` will need to be filtered out of any request for the directory itself even if we want to return the rest (to allow the client to enumerate files, etc.).

Of course there is the question of the possible directory files `/` leading-up to the directory we want to add a file to.  My intuition is to check all of them starting at the root, but I'm not sure thats the right answer.  First off, that's going to take time and I don't like wasting time.  Second, it might make for a more flexible system if we don't "inherit" permissions from the "enclosing" directory.

For example, if we only look at the directory we're writing in, it would be possible to next a directory with more open access inside a directory with more restricted access.  To put this in Unix terms, you want to allow a user to write unrestrictly to their home directory under `/home/jason` but you don't want them to write to `/home`.  Unix allows this through a complex set of permission modes but we could do something similar by simply ignoring inherited permissions and saying "if it's OK for someone to create a directory here, it's OK for them to decide the permissions down further".

### open questions

* If we store directories (`/`) like any other file, what's the best way for JSFS to read/write/parse these files (it currently doesn't manipulate any data stored within blocks this way)?
* Since the server is parsing and filtering values stored in directory entries (i.e., not returning `access_key`), should it parse and render other elements (for example: producing an HTML directory listing if requested)?
* Is there any reason to use different default permission for directories, and/or what happens if someone makes a directory `private`?
