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

import { GetParam } from '../utils.mjs';
import { Jnode } from '../jnode.mjs';

export async function Post(req, jnode) {

    // TODO: In previous versions we'd generate an accessKey if one
    // isn't provided as part of the POST request, but maybe we should
    // reject/fail the request instead to force people to use a
    // known key when they store a file?
    
    // TODO: Implement everything else.
    
    // TODO: Maybe don't return the entire jnode?
    return jnode;
}
