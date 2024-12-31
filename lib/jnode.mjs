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
        this.private = false;
        this.fingerprint = null;
        this.access_key = null;
        this.content_type = "application/octet-stream";
        this.file_size = 0;
        this.block_size = this.block_size;
        this.blocks = {};

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

