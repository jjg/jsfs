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

import { Jnode } from '../jnode.mjs';

export async function Head(res, jnode) {
    // TODO: Test the jnode to see if it was loaded,
    // if so, set the status to 200 and return the meatadata.
    // If not, just set the status to 404.
    res.writeHead(200, {
        'x-jsfs-version': jnode.version,
    });
}

