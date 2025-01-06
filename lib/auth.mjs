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

import { Jnode } from './jnode.mjs';

export async function Auth(res, jnode) {

    // Get the supplied accessKey
    // TODO: Check querystring for access key
    // TODO: Compute/extract key from token here?
    const reqKey = res.headers['x-jsfs-access-key'];

    // Determine the jnode's accessKey
    // TODO: Is this the right way to test for un-setness?
    if(!jnode.accessKey){
        // TODO: Crawl up jspace looking for a directory
        // TODO: If a directory is found, set the accessKey
        // of the provided jnode to the directory's accessKey.

        // TODO: Should we persist the jnode at this point
        // to preserve the newly-set accessKey?
    }

    if(reqKey == jnode.accessKey){
        return true;
    } else {
        return false;
    }
}

