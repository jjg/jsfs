# Experimental unikernel build

This is how to build & deploy a JSFS unikernel to Digital Ocean.  To do this you'll need to first create an API token and a Spaces bucket.

## Setup

```
export DO_TOKEN= 
export SPACES_KEY=
export SPACES_SECRET= 

sudo apt install qemu-utils
```

## Build & Deploy
```
ops image create -c config.json --package eyberg/node:20.5.0 -i jsfs -t do -c config.json
```

Check to make sure it was built
```
ops image list
```

Create an *new* instance of the new image
```
ops instance create jsfs -t do -c config.json
```

> NOTE: if this is an upgrade to an existing instance, migrate data, update DNS and delete the old instance.
> TODO: is there a way to upgrade an instance in-place with a new image?

Check to make sure it was created
```
ops instance list -t do
```


## References

* https://docs.ops.city/ops/digital_ocean
