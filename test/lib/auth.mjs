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
import assert from 'assert';

import { Auth } from '../../lib/auth.mjs';
import { Jnode } from '../../lib/jnode.mjs';
import { GetJspace } from '../../lib/utils.mjs';


describe('auth', function () {
    describe('#Auth()', function () {

        // Keys
        it('should allow a valid key for an existing jnode', async function () {
            // TODO: See if there is a better way to mock http.IncomingMessage
            const req = {
                url: '/about.html',
                headers: {
                    'host': 'jasongullickson.com',
                    'x-jsfs-access-key': 'foo',
                }
            }

            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);

            assert.equal(authResult, true);
        });
        it('should allow a valid key for an upstream directory', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid key for an existing directory', async function () {
            assert.fail("Not implemented");
        });
        it('should accept key provied in querystring', async function () {
            const req = {
                url: '/about.html?accesskey=foo',
                headers: {
                    'host': 'jasongullickson.com',
                }
            }

            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);

            assert.equal(authResult, true);
        });

        // Tokens
        it('should allow a durable token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a temporary token ', async function () {
            assert.fail("Not implemented");
        });
        it('should accept a valid token in the querystring', async function () {
            assert.fail("Not implemented");
        });

        it('should deny an invalid durable token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid temporary token ', async function () {
            assert.fail("Not implemented");
        });

        // Verb-specific tokens
        it('should allow a valid HEAD token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid GET token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid POST token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid PUT token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid DELETE token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid EXECUTE token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid MOVE token ', async function () {
            assert.fail("Not implemented");
        });
        it('should allow a valid COPY token ', async function () {
            assert.fail("Not implemented");
        });

        it('should deny an invalid HEAD token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid GET token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid POST token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid PUT token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid DELETE token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid EXECUTE token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid MOVE token ', async function () {
            assert.fail("Not implemented");
        });
        it('should deny an invalid COPY token ', async function () {
            assert.fail("Not implemented");
        });
    });
});
