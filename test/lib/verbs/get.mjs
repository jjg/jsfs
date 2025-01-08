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

import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'assert';

import { GetJspace } from '../../../lib/utils.mjs';
import { Jnode } from '../../../lib/jnode.mjs';
import { Auth } from '../../../lib/auth.mjs';
import { Get } from '../../../lib/verbs/get.mjs';


describe.only('get', function () {
    describe('#Get()', function () {
        it('should return a stored file', async function () {

            const req = {
                url: '/about.html',
                method: 'GET',
                headers: {
                    'host': 'jasongullickson.com',
                }
            }
            // TODO: Mock a more complete response object()?
            const res = {};

            // Simulate the steps taken when processing the client request.
            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            const authResult = await Auth(req, res, jnode);

            // Do the GET
            await Get(req, res, jnode);

            // Make sure HTTP status is sucessful.
            assert.equal(res.status, 200);

            // TODO: Test to make sure file was correctly returned.
        });
        it('should 404 if file doesnt exist')
    });
});
