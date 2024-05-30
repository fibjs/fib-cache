const test = require('test');
test.setup();

const { LRU } = require('..');
const coroutine = require('coroutine');

describe('LRU', () => {
    it('should be a class', () => {
        assert.isFunction(LRU);
    });

    it('test normal', () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        assert.equal(lru.get('a'), undefined);
        assert.equal(lru.get('b'), 2);
        assert.equal(lru.get('c'), 3);
    });

    it("test has", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);

        assert.equal(lru.has('a'), true);
        assert.equal(lru.has('b'), true);
        assert.equal(lru.has('c'), false);
    });

    it("test delete", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.delete('b');

        assert.equal(lru.get('a'), 1);
        assert.equal(lru.get('b'), undefined);
        assert.equal(lru.size, 1);

        lru.delete('a');

        assert.equal(lru.get('a'), undefined);
        assert.equal(lru.size, 0);
    });

    it("test update", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('a', 3);

        assert.equal(lru.get('a'), 3);
        assert.equal(lru.get('b'), 2);
    });

    it("test clear", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.clear();

        assert.equal(lru.get('a'), undefined);
        assert.equal(lru.get('b'), undefined);
    });

    it("test size", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);

        assert.equal(lru.size, 2);
    });

    it("test max", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        assert.equal(lru.size, 2);

        assert.equal(lru.get('a'), undefined);
        assert.equal(lru.get('b'), 2);
        assert.equal(lru.get('c'), 3);
    });

    it('test ttl', () => {
        const lru = new LRU({
            max: 2,
            ttl: 100
        });

        lru.set('a', 1);
        lru.set('b', 2);

        coroutine.sleep(200);

        assert.equal(lru.get('a'), undefined);
        assert.equal(lru.get('b'), undefined);
    });

    it("test auto evict ttl", () => {
        const lru = new LRU({
            max: 2,
            ttl: 100
        });

        lru.set('a', 1);
        coroutine.sleep(50);
        lru.set('b', 2);

        assert.equal(lru.get('a'), 1);
        assert.equal(lru.get('b'), 2);

        coroutine.sleep(100);

        lru.set('c', 3);

        assert.equal(lru.size, 1);

        assert.equal(lru.get('a'), undefined);
        assert.equal(lru.get('b'), undefined);
        assert.equal(lru.get('c'), 3);
    });

    it("test values", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);

        assert.deepEqual(lru.values(), [1, 2]);
    });

    it("test keys", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);

        assert.deepEqual(lru.keys(), ['a', 'b']);
    });

    it("test entries", () => {
        const lru = new LRU({
            max: 2
        });

        lru.set('a', 1);
        lru.set('b', 2);

        assert.deepEqual(lru.entries(), [['a', 1], ['b', 2]]);
    });

    describe("test solver", () => {
        it("normal test", () => {
            var resolve_count = 0;
            const lru = new LRU({
                max: 2,
                solver: (key) => {
                    resolve_count++;
                    coroutine.sleep(10);
                    return key + resolve_count;
                }
            });

            var v;
            setImmediate(() => {
                v = lru.get('a');
            });

            const v1 = lru.get('a');

            assert.equal(v1, 'a1');

            assert.equal(v, undefined);
            coroutine.sleep(10);
            assert.equal(v, "a1");

            assert.equal(resolve_count, 1);
        });

        it("deleted during solving", () => {
            var resolve_count = 0;
            const lru = new LRU({
                max: 2,
                solver: (key) => {
                    resolve_count++;
                    coroutine.sleep(10);
                    return key + resolve_count;
                }
            });

            setImmediate(() => {
                lru.delete('a');
            });

            var v = lru.get('a');

            assert.equal(v, "a1");
            assert.equal(lru.size, 0);
        });

        it("deleted during solving and not found", () => {
            var resolve_count = 0;
            const lru = new LRU({
                max: 2,
                solver: (key) => {
                    resolve_count++;
                    coroutine.sleep(10);
                }
            });

            setImmediate(() => {
                lru.delete('a');
            });

            var v = lru.get('a');

            assert.equal(v, undefined);
            assert.equal(lru.size, 0);
        });
    });

});

test.run();
