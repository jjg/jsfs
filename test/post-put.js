var request = require('supertest');
var should = require('should');

describe('POST /test.json', function(){
	it('respond with json', function(done){
		request('http://localhost:7302')
			.post('/test.json')
			.timeout(1000)
			.set('x-access-key', 'baz')
			.send(
				{'foo':'bar'}
			).expect(200,done);
	})
})