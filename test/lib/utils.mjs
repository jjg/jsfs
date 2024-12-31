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

import { GetJspace } from '../../lib/utils.mjs';
import assert from 'assert';

describe('utils', function () {
    describe('#GetJspace()', function () {
        it('should return a JSFS jspace string', async function () {
            const jspace = await GetJspace("jasongullickson.com", "/home/welcome.html");
            assert.equal(jspace, "/com.jasongullickson/home/welcome.html");
        });
        it('should not modify a provided jspace string', async function () {
            const jspace = await GetJspace("jasongullickson.com", "/.com.jasongullickson/home/welcome.html");
            
            assert.equal(jspace, "/com.jasongullickson/home/welcome.html");
        });
    });
});
