const { describe, it } = require('node:test');
const assert = require('assert');
const { LRU } = require('..');

describe('Basic Functionality', () => {
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

    it("test order maintenance on get", () => {
        const lru = new LRU({
            max: 3
        });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        lru.get('a');
        lru.set('d', 4);

        assert.equal(lru.get('b'), undefined);
        assert.equal(lru.get('a'), 1);
        assert.equal(lru.get('c'), 3);
        assert.equal(lru.get('d'), 4);
    });

    it("should handle linked list operations correctly when item is last", () => {
        const lru = new LRU({ max: 3 });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        lru.get('c');

        assert.equal(lru.first.key, 'a');
        assert.equal(lru.first.next.key, 'b');
        assert.equal(lru.last.key, 'c');
        assert.equal(lru.last.prev.key, 'b');
        assert.equal(lru.last.next, null);
    });

    it("should maintain linked list integrity when reordering items", () => {
        const lru = new LRU({ max: 3 });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        lru.get('b');

        assert.equal(lru.first.key, 'a');
        assert.equal(lru.first.next.key, 'c');
        assert.equal(lru.first.prev, null);
        assert.equal(lru.last.key, 'b');
        assert.equal(lru.last.next, null);
        assert.equal(lru.last.prev.key, 'c');
        
        lru.get('a');

        assert.equal(lru.first.key, 'c');
        assert.equal(lru.first.next.key, 'b');
        assert.equal(lru.first.prev, null);
        assert.equal(lru.last.key, 'a');
        assert.equal(lru.last.next, null);
        assert.equal(lru.last.prev.key, 'b');
    });

    it("should maintain linked list integrity when reordering items", () => {
        const lru = new LRU({ max: 3 });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        lru.get('b');

        assert.equal(lru.first.key, 'a');
        assert.equal(lru.first.next.key, 'c');
        assert.equal(lru.first.prev, null);
        assert.equal(lru.last.key, 'b');
        assert.equal(lru.last.next, null);
        assert.equal(lru.last.prev.key, 'c');
    });

    it("should properly cleanup all references when item is deleted", () => {
        const lru = new LRU({ max: 3 });

        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);

        const itemB = lru.items['b'];
        lru.delete('b');

        assert.equal(itemB.owner, undefined);
        assert.equal(itemB.prev, null);
        assert.equal(itemB.next, null);
        assert.equal('b' in lru.items, false);
        assert.equal(lru.first.key, 'a');
        assert.equal(lru.last.key, 'c');
        assert.equal(lru.first.next, lru.last);
        assert.equal(lru.last.prev, lru.first);
    });

    it("should properly cleanup references when using resolver", () => {
        const lru = new LRU({
            max: 2,
            resolver: (key) => key + '1'
        });

        const promise = lru.get('a');
        const itemA = lru.items['a'];
        lru.delete('a');

        assert.equal(itemA.owner, undefined);
        assert.equal(itemA.prev, null);
        assert.equal(itemA.next, null);
        assert.equal('a' in lru.items, false);
    });
});

describe('Parameter Validation', () => {
    it("should validate max parameter", () => {
        assert.throws(() => new LRU({ max: "2" }), TypeError);
        assert.throws(() => new LRU({ max: -1 }), RangeError);
        assert.doesNotThrow(() => new LRU({ max: 0 }));
        assert.doesNotThrow(() => new LRU({ max: 1 }));
    });

    it("should validate ttl parameter", () => {
        assert.throws(() => new LRU({ ttl: "100" }), TypeError);
        assert.throws(() => new LRU({ ttl: -1 }), RangeError);
        assert.doesNotThrow(() => new LRU({ ttl: 0 }));
        assert.doesNotThrow(() => new LRU({ ttl: 100 }));
    });

    it("should validate resolver parameter", () => {
        assert.doesNotThrow(() => new LRU({}));
        
        assert.throws(() => new LRU({ resolver: "function" }), TypeError);
        assert.throws(() => new LRU({ resolver: 1 }), TypeError);
        assert.throws(() => new LRU({ resolver: {} }), TypeError);
        assert.throws(() => new LRU({ resolver: [] }), TypeError);
        
        assert.doesNotThrow(() => new LRU({ resolver: () => {} }));
    });

    it("should use default values correctly", () => {
        const lru = new LRU();
        assert.equal(lru.max, 0);
        assert.equal(lru.ttl, 0);
        assert.equal(lru.resolver, undefined);
    });
});
