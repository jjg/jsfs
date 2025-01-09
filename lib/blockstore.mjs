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


export async function Load(blockName) {

    // TODO: Call blockdrivers to get block data.
    // This is where things like mirror/stripe/federation happen.

    // TODO: Return a buffer of some sort (ArrayBuffer?).
    return "foo";
}

export async function Store(block) {
    const blockName = crypto.hash('sha1', blockData);

    // TODO: Call blockdrivers to persist the block.
    // This is where things like mirror/stripe/federation happen.

    return blockName;
}
