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
                url: '/about.html?access-key=foo',
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
            const req = {
                url: '/about.html',
                method: 'GET',
                headers: {
                    'host': 'jasongullickson.com',
                    'x-jsfs-access-token': '15bc6cfd907fcf2a86b1da6d1b7b75c0a79536a9',
                }
            }
            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);
            assert.equal(authResult, true);
        });
        it('should allow a temporary token ', async function () {
            const req = {
                url: '/about.html',
                method: 'GET',
                headers: {
                    'host': 'jasongullickson.com',
                    'x-jsfs-access-token': '14cc3a47c2ce6bae52b5a8da90b5eb219d9b1ded',
                    'x-jsfs-expires': 555,
                }
            }
            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);
            assert.equal(authResult, true);
        });
        it('should accept a valid token in the querystring', async function () {
            const req = {
                url: '/about.html?access-token=15bc6cfd907fcf2a86b1da6d1b7b75c0a79536a9',
                method: 'GET',
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

        it('should deny an invalid durable token ', async function () {
            const req = {
                url: '/about.html?access-token=bogus',
                method: 'GET',
                headers: {
                    'host': 'jasongullickson.com',
                }
            }
            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);
            assert.equal(authResult, false);
        });
        it('should deny an invalid temporary token ', async function () {
            const req = {
                url: '/about.html',
                method: 'GET',
                headers: {
                    'host': 'jasongullickson.com',
                    'x-jsfs-access-token': 'bogus',
                    'x-jsfs-expires': 555,
                }
            }
            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);
            assert.equal(authResult, false);
        });
        it.only('should deny an expired temporary token ', async function () {

            // Create a token that expires 6 hours ago.
            let d = new Date();
            d.setTime(d.getTime() - 6 * 60*60*1000);

            const key = 'foo';
            const method = 'GET';
            const expires = `${Math.floor(d.getTime() / 1000)}`;
            const hash = crypto.hash('sha1', `${key}${method}${expires}`);
            const token = `${hash}${expires}`;

            const req = {
                url: '/about.html',
                method: 'GET',
                headers: {
                    'host': 'jasongullickson.com',
                    'x-jsfs-access-token': token,
                }
            }

            const jspace = await GetJspace(req.headers['host'], req.url);
            const jnode = new Jnode(jspace);
            jnode.accessKey = 'foo';

            const authResult = await Auth(req, jnode);
            assert.equal(authResult, false);
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
