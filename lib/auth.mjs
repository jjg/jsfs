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

import { GetParam } from './utils.mjs';
import { Jnode } from './jnode.mjs';

export async function Auth(req, jnode) {
    // Determine the jnode's accessKey
    // TODO: Is this the right way to test for un-setness?
    if(!jnode.accessKey){
        // TODO: Crawl up jspace looking for a directory
        // TODO: If a directory is found, set the accessKey
        // of the provided jnode to the directory's accessKey.

        // TODO: Should we persist the jnode at this point
        // to preserve the newly-set accessKey?
    }

    // Extract any supplied access key
    // TODO: Use the real hostname, etc. not this hard-coded thing.
    const reqKey = await GetParam(req, 'access-key');

    // If a key was found, validate it.
    if(reqKey == jnode.accessKey){
        return true;
    }

    // If no key was provided in the request, try a token
    const reqToken = await GetParam(req, 'access-token');

    // Validate token.
    const accessKey = jnode.accessKey;
    const method = req.method;
    var expectedToken = null;

    // If the token is longer than the default hash, process it as expiring.
    // TODO: Test token length against some configuration value that
    // is specific to the hash function used instead of hard-coded to
    // SHA1 length.
    if(reqToken.length > 40){
        const expires = reqToken.slice(40);

        // If the token has expired, don't authorize the request.
        const now = Math.floor(Date.now() / 1000);
        if(expires < now){
            return false;
        }
        expectedToken = `${crypto.hash('sha1', accessKey + method + expires)}${expires}`;
    } else {
        expectedToken = crypto.hash('sha1', accessKey + method);
    }

    if(reqToken == expectedToken){
        return true;
    }

    // If all else fails, don't authorize the request.
    return false;
}

