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
    // TODO: Check passed-in jnode for accessKey,
    // if not found, crawl back up the jspace
    // inspecting directory jnodes until an accesKey
    // is found.  
    
    // Note If no directory contains an accessKey, we 
    // might want to retain the feature of configuration-
    // level STATIC_ACCESS_KEYS, but it would be preferable
    // to provide this functionality through directory
    // use if possible.
    
    // TODO: Return the actual auth result.
    if(res.headers['x-jsfs-access-key'] == jnode.accessKey){
        return true;
    } else {
        return false;
    }
}

