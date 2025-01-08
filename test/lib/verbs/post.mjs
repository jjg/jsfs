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

import { Readable } from 'node:stream';
import http from 'node:http';
import assert from 'assert';

import { GetJspace } from '../../../lib/utils.mjs';
import { Jnode } from '../../../lib/jnode.mjs';
import { Auth } from '../../../lib/auth.mjs';
import { Post } from '../../../lib/verbs/post.mjs';


describe.only('POST verb handling', function () {
    describe('#Post()', function () {
        it('should create a new file from posted data', async function () {

            // TODO: Add file data to this fake IncomingMessage.
            class Req extends Readable{};
            const req = Req;
            req.url = '/about.html';
            req.method = 'POST';
            req.headers = {
                'host': 'jasongullickson.com',
            };
            
            console.log(req);

            // TODO: Mock a more complete response object()?
            const res = {};

            // Simulate the steps taken when processing the client request.
            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            const authResult = await Auth(req, res, jnode);

            // Do the Post
            await Post(req, res, jnode);

            // Make sure HTTP status is sucessful.
            assert.equal(res.status, 200);

            // TODO: Do a more complete job of testing the result
            // TODO: Test version
            // TODO: Test fingerprint
            // TODO: Test accessKey
            // TODO: Test fileSize
            // TODO: Test blockSize
            assert.equal(jnode.blocks.length, 1);

            // TODO: Issue additional verbs (HEAD, GET) to ensure that
            // the file has been stored correctly?
        });
        it('should utilize a client-provided accessKey')
        it('should set HTTP status to 401 if authorization is denied')
        it('should set HTTP status to 500 if an error occurs')
        it('should handle streaming data correctly')
        it('should write the correct content-length header')
        it('should set HTTP method not allowed if file exists')
        it('should handle range requests correctly')
    });
});
