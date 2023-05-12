# Experimental unikernel build

There's a lot more to say but for now I'm just going to dump some commands in here.

```
export DO_TOKEN= 
export SPACES_KEY=
export SPACES_SECRET= 

ops image create -c config.json --package eyberg/node:v18.12.1 -i jsfs -t do -c config.json
ops instance create jsfs -t do -c config.json
ops instance list -t do
```

# References

* https://docs.ops.city/ops/digital_ocean
