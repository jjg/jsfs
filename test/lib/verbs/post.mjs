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
import { Post } from '../../../lib/verbs/post.mjs';


describe.only('post', function () {
    describe('#Post()', function () {
        it('should accept a file and return a jnode', async function () {

            // TODO: Add file data to this fake IncomingMessage.
            const req = {
                url: '/about.html',
                method: 'POST',
                headers: {
                    'host': 'jasongullickson.com',
                }
            }

            // Mock the steps before the method switch
            // Get jspace
            const jspace = await GetJspace(req.headers['host'], req.url);
            // Get jnode
            const jnode = new Jnode(jspace);

            // TODO: Set the accessKey using a value provided by the request.
            //jnode.accessKey = 'foo';
            //jnode.private = false;

            // Auth the request
            const authResult = await Auth(req, jnode);

            // TODO: Call Post and get an actual jnode back
            const postResult = await Post(req, jnode);

            // TODO: Do a more complete job of testing the result
            assert.equal(postResult.jspace, jspace);
        });
    });
});
