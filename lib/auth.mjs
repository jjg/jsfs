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

import { URL } from 'node:url';

import { Jnode } from './jnode.mjs';

export async function Auth(res, jnode) {
    // Extract any supplied access key
    // TODO: Use the real hostname not this hard-coded thing.
    const url = new URL(res.url, 'http://localhost:7302/');

    // TODO: See if there is a more compact way to do this.
    const queryKey = url.searchParams.get('access-key');
    const headerKey = res.headers['x-jsfs-access-key'];
    const reqKey = queryKey == null ? headerKey : queryKey;

    // If no key was provided, try extracting from a token.
    if(!reqKey) {
        // TODO: Check for access token
        // TODO: Try extracting key from token
    }

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

