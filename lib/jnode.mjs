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

// A jnode contains file metadata and a list of blocks representing file data
class Jnode {
    constructor(jspace) {
        this.jspace = jspace;
        this.created = (new Date()).getTime();
        this.version = 0;
        this.private = false;   // TODO: Should this default to true?
        this.fingerprint = null;
        this.accessKey = null;
        this.contentType = "application/octet-stream";
        this.fileSize = 0;
        this.blockSize = 0;

        // NOTE: I switched blocks to an object because I've always been
        // concerned about the order of an array changing as it does in
        // some languages.  After doing some reading it seems that ES6
        // treats arrays more like objects and therefore the order shouldn't
        // change.  I still don't trust it but it's worked so far so I'll
        // leave it this way until I can prove that it's a problem.
        this.blocks = [];

        // create fingerprint to uniquely identify this file
        //this.fingerprint = utils.sha1_to_hex(this.jspace);

        // use fingerprint as default key
        //this.access_key = this.file_metadata.fingerprint;
    }
    async Load(){
        // TODO: Load this jnode from the blockstore,
        // if something goes wrong, return the error.
        return null;
    }
    async Save(){
        // TODO: Save this jnode to the blockstore,
        // if something goes wrong, return the error.
        return null;
    }
}

export { Jnode };

