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

//import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'assert';

import { Load, Store, Purge } from '../../lib/blockstore.mjs';


describe('blockstore', function () {

    // NOTE: This test has cross-describe dependencies
    // on files written to the filesystem.  I'm not sure
    // if that's OK, so this might have to be revisited.

    const blockData = 'foo';
    const blockHash = crypto.hash('sha1', blockData);

    describe('#Store()', function () {
        it('should store a block of data', async function() {
            Store(blockHash, blockData);

            // TODO: Right now this test will pass unless
            // an exception is thrown.  It would be better
            // to also try reading the block back, but since
            // this is a detached async operation, I'm not
            // sure how to do that in a way that doesn't 
            // result in false-positives (i.e. flaky tests).
            //
            // I guess for testing purposes Store() could be
            // awaited since this test isn't about maximizing
            // performance...?
        });
    });

    describe('#Load()', function () {
        it('should load the requested block data', async function(){
            const result = await Load(blockHash);

            // TODO: Test this in a more meaningful way.
            assert.notEqual(result, null);

            // TODO: Do I really need all this decoding?
            const decoder = new TextDecoder();
            const resultString = decoder.decode(result);
            assert.equal(resultString, blockData);
        });
    });
    describe('#Purge()', function () {
        it('should erase a block from the store', async function (){

            // TODO: Maybe a test should confirm the purge occured,
            // but for now we'll just be happy if it doesn't throw.
            await Purge(blockHash);
        });
    });
});
