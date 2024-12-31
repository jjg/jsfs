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
        
    });
});
