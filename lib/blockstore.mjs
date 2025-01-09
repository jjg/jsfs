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
import { open } from 'node:fs/promises';

export async function Store(blockData) {
    const blockName = crypto.hash('sha1', blockData);

    // NOTE: This is where things like mirror/stripe/federation happen.

    // TODO: Call blockdrivers to get block data instead of 
    // writing it directly to disk as is done here.
    // TODO: Apparently this isn't how you get a file handle for reading.
    const blockFile = await open(`/home/jason/Projects/jsfs/test/testdata/${blockName}.jblock`);
    const result = await blockFile.write(blockData);

    // DEBUG
    console.log(result);

    return blockName;
}

export async function Load(blockName) {

    // NOTE: This is where things like mirror/stripe/federation happen.

    // TODO: Call blockdrivers to get block data instead of 
    // loading it directly from disk as is done here.
    const blockFile = await open(`/home/jason/Projects/jsfs/test/testdata/${blockName}.jblock`);
    const blockData = [];
    for await (const chunk of blockFile.readableWebStream()) {
        blockData.push(chunk);
    }
    await blockFile.close();

    return blockData;
}
