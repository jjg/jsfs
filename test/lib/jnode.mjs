import { NewJnode } from '../../lib/jnode.mjs';
import assert from 'assert';

describe('jnode', function () {
    describe('#NewJnode()', function () {
        it('should return an initialized jnode', function () {
            const foo = NewJnode();
            assert.equal(foo.id, 0);
        });
    });
});
