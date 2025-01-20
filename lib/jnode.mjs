/*
JSFS
Copyright (C) 2025  Jason J. Gullickson

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import crypto from 'node:crypto';

import { Load, Store } from './blockstore.mjs';

// A jnode contains file metadata and a list of blocks representing file data
class Jnode {
    constructor(jspace) {
        this.jspace = jspace;
        this.created = (new Date()).getTime();
        this.version = 0;
        this.private = false;
        this.fingerprint = null;
        this.accessKey = null;
        this.contentType = "application/octet-stream";
        this.fileSize = 0;
        this.blockSize = 0;

        // NOTE: I had switched blocks to an object because I've always been
        // concerned about the order of an array changing as it does in
        // some languages.  After doing some reading it seems that ES6
        // treats arrays more like objects and therefore the order shouldn't
        // change.  I still don't trust it but it's worked so far so I'll
        // leave it this way until I can prove that it's a problem.
        this.blocks = [];

        // create fingerprint to uniquely identify this file
        // TODO: Do we need the fingerprint?  What is it used for?
        this.fingerprint = crypto.hash('sha1', this.jspace);

        // use fingerprint as default key
        // TODO: This was originally a convenience, but now that
        // we're going to have directory-level permissions I think
        // it's probably going to go away since every request will
        // need to provide *some* sort of key or token.
        // TODO: Should this maybe be salted so it's more secure?
        //this.accessKey = this.fingerprint;
    }
    async Load(){
        // Try to load the jnode from the blockstore.
        //const blockHash = this.fingerprint;
        let result = null;
        try {
            result = await Load(this.fingerprint);
        } catch(e){
            // NOTE: Let the caller decide if this is OK.
            return e;
        }

        // TODO: Do I really need all this decoding?
        const decoder = new TextDecoder();
        const resultString = decoder.decode(result);
        const resultObject = JSON.parse(resultString);

        // Parse result from blockstore and assign properties.
        // TODO: Look into a more streamlined way to unpack this.
        this.created = resultObject.created;
        this.version = resultObject.version;
        this.private = resultObject.private;
        this.fingerprint = resultObject.fingerprint;
        this.accessKey = resultObject.accessKey;
        this.contentType = resultObject.contentType;
        this.fileSize = resultObject.fileSize;
        this.blockSize = resultObject.blockSize;
        this.blocks = resultObject.blocks;

        return null;
    }
    async Save(){
        // Save this jnode to the blockstore,
        // if something goes wrong, return the error
        // (or maybe just throw an exception?).

        const blockData = JSON.stringify(this);
        const blockHash = this.fingerprint;

        // TODO: Do we *need* to await here?
        await Store(blockHash, blockData);

        return null;
    }
}

export { Jnode };

