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
import { Buffer } from 'node:buffer';

import { GetParam } from '../utils.mjs';
import { Jnode } from '../jnode.mjs';


export async function Post(req, res, jnode) {

    // TODO: Figure out if this will still work with a real HTTP request.
    for await (const chunk of req.readableWebStream()) {

        // TODO: Slice whole chunks (of unknown size) down to fit into
        // the configured block size.  This code cheats for now.
        const blockData = Buffer.from(chunk);

        // Compute a name for the block by hashing it.
        // TODO: Move this into blockstore.
        const blockName = crypto.hash('sha1', blockData);

        // TODO: Send the chunk to the blockstore.

        // Add the name of each block to the jnode.
        jnode.blocks.push(blockName);
    }

    // TODO: Update any other jnode properties that make sense.
    // TODO: Save the updated jnode.
    // TODO: Update the directory.

    // TODO: Set the status to reflect the actual result of POST processing
    res.status = 200;
}
