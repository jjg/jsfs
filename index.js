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

import { http } from 'node:http';
import { Jnode } from './lib/jnode.mjs';
import { head } from './lib/verbs/head.mjs';

// DEBUG
//const foo = NewJnode();
//console.log(foo);

// TODO: Start logging
// TODO: Load the config

// Start the http listener
const server = http.createServer();
server.on('request', async (req, res) => {

    // Translate the incoming url to jspace
    const jspace = await GetJspace(req.host, req.url);
    
    // TODO: Get the jnode
    // TODO: Auth the request
    
    switch(req.method) {
        case 'HEAD':
            // Handle HEAD
            // HEAD just returns metadata rendered as HTTP headers,
            // so if we have a jnode, just translate it.  If not,
            // return an error
            res.write(await head(req));
            break;
        case 'GET':
            // TODO: Handle GET
            break;
        case 'POST':
            // TODO: Handle POST
            break;
        case 'PUT':
            // TODO: Handle PUT
            break;
        case 'DELETE':
            // TODO: Handle DELETE
            break;
        case 'EXECUTE':
            // TODO: Handle EXECUTE
            break;
        default:
            // TODO: Return error
            break;
    }
    
    res.end();
});
server.on('clientError', async (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

