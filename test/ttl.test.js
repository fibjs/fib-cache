const { describe, it } = require('node:test');
const assert = require('assert');
const { LRU } = require('..');
const coroutine = require('coroutine');

describe('TTL Tests', () => {
    it("test ttl", () => {
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

    it("test ttl refresh on update", () => {
        const lru = new LRU({
            max: 2,
            ttl: 100
        });

        lru.set('a', 1);
        coroutine.sleep(50);
        
        lru.set('a', 2);
        coroutine.sleep(70);

        assert.equal(lru.get('a'), 2);
    });

    it("should handle ttl=0 correctly", () => {
        const lru = new LRU({
            max: 2,
            ttl: 0
        });

        lru.set('a', 1);
        let item = lru.items['a'];
        
        assert.equal(item.expiry, undefined);
        
        assert.equal(lru.get('a'), 1);

        lru.set('a', 2);
        item = lru.items['a'];
        assert.equal(item.expiry, undefined);  
        assert.equal(lru.get('a'), 2);
    });

    it("should handle ttl updates correctly", () => {
        const lru = new LRU({
            max: 2,
            ttl: 100
        });

        lru.set('a', 1);
        const initialExpiry = lru.items['a'].expiry;
        
        coroutine.sleep(50);
        
        lru.set('a', 2);
        const newExpiry = lru.items['a'].expiry;
        
        assert.ok(newExpiry > initialExpiry);
        
        assert.equal(lru.get('a'), 2);
        
        coroutine.sleep(60);
        
        assert.equal(lru.get('a'), 2);
    });

    it("should cleanup references when item expires", () => {
        const lru = new LRU({
            max: 2,
            ttl: 50
        });
        
        lru.set('a', 1);
        const itemA = lru.items['a'];
        
        coroutine.sleep(100);
        
        assert.equal(lru.get('a'), undefined);
        
        assert.equal(itemA.owner, undefined);
        assert.equal(itemA.prev, null);
        assert.equal(itemA.next, null);
        assert.equal('a' in lru.items, false);
    });
});
