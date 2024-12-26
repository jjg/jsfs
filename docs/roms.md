# ROMs

JSFS ROMs are archives containing `jNode`s and `jBlocks` representing a self-contained and/or stand-alone piece of data or software.  The most obvious use of this is for distributing web applications that can be run directly from JSFS like [jedi](./jedi.md).  ROMs can be mounted into a JSFS filesystem as part of the [config](./config.md) or simply uncompressed into the directories of the [blockstore](./blockstore.md).

Maybe there's some sort of "manifest" or other document/metadata that should accompany a ROM, but I'm not sure.  I really like the idea that they are simply native constructs and not some special case.
