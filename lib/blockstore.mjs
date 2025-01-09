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
import { open, writeFile } from 'node:fs/promises';

// TODO: Move this to config.
const _BLOCK_SIZE = 1024;

export async function Store(blockHash, blockData) {

    // NOTE: This is where things like mirror/stripe/federation happen.

    // TODO: Call blockdrivers to get block data instead of 
    // writing it directly to disk as is done here.
    // TODO: Result is null unless something goes wrong, so maybe I
    // should be testing result and dealing with the fallout constructively?
    // Alternatively, this might get used for raid/retry logics?
    // TODO: Maybe calling this w/o await is enough to kick-off
    // the write asyncronously and get us back to the caller quickly?
    const result = await writeFile(
        `/home/jason/Projects/jsfs/test/testdata/${blockHash}.jblock`,
        blockData
    );
}

export async function Load(blockHash) {

    // NOTE: This is where things like mirror/stripe/federation happen.

    // TODO: Call blockdrivers to get block data instead of 
    // loading it directly from disk as is done here.
    const blockFile = await open(
        `/home/jason/Projects/jsfs/test/testdata/${blockHash}.jblock`
    );

    // NOTE: by setting size to _BLOCK_SIZE, this reads the entire
    // block in one go.  It feels kind of dumb to do this in a loop,
    // and it might not work great for large block sizes, so this
    // may need to be revisited at some point.
    let blockData = new Uint8Array(_BLOCK_SIZE);
    for await (const chunk of blockFile.readableWebStream(
        {size: _BLOCK_SIZE}
    )) {
        blockData = chunk;
    }
    await blockFile.close();

    return blockData;
}
