const { describe, it } = require('node:test');
const assert = require('assert');
const { LRU } = require('..');
const coroutine = require('coroutine');

describe('Concurrency Tests', () => {
    it("should handle concurrent set and delete", () => {
        const lru = new LRU({ max: 2 });
        const fibers = [];

        fibers.push(coroutine.start(() => {
            lru.set('key', 'value1');
        }));

        fibers.push(coroutine.start(() => {
            coroutine.sleep(20);
            lru.delete('key');
        }));

        fibers.push(coroutine.start(() => {
            coroutine.sleep(30);
            lru.set('key', 'value2');
        }));

        fibers.forEach(f => f.join());
        assert.equal(lru.size <= 1, true);
    });

    it("should handle concurrent TTL expiration and access", () => {
        const lru = new LRU({ ttl: 30 });
        const results = [];
        const fibers = [];

        lru.set('key', 'value');

        fibers.push(coroutine.start(() => {
            coroutine.sleep(20);
            results.push(lru.get('key'));
        }));

        fibers.push(coroutine.start(() => {
            coroutine.sleep(40);
            results.push(lru.get('key'));
        }));

        fibers.forEach(f => f.join());
        assert.deepEqual(results, ['value', undefined]);
    });

    it("should handle multiple concurrent operations", () => {
        const lru = new LRU({ max: 3 });
        const fibers = [];
        const ops = 10;

        for (let i = 0; i < ops; i++) {
            fibers.push(coroutine.start(() => {
                lru.set(`key${i}`, i);
                lru.get(`key${i}`);
                if (i % 2 === 0) {
                    lru.delete(`key${i}`);
                }
            }));
        }

        fibers.forEach(f => f.join());
        assert.equal(lru.size <= 3, true);
    });

    it("should handle linked list integrity under concurrent access", () => {
        const lru = new LRU({ max: 3 });
        const fibers = [];

        for (let i = 0; i < 5; i++) {
            fibers.push(coroutine.start(() => {
                lru.set(`key${i}`, i);
                if (i % 2 === 0) {
                    coroutine.sleep(10);
                    lru.delete(`key${i}`);
                }
            }));
        }

        fibers.forEach(f => f.join());

        let current = lru.first;
        const seen = new Set();
        while (current) {
            assert.equal(current.owner, lru);
            if (current.next) {
                assert.equal(current.next.prev, current);
            }
            assert.equal(seen.has(current.key), false);
            seen.add(current.key);
            current = current.next;
        }

        assert.equal(seen.size, lru.size);
    });

    it("should handle TTL race conditions correctly", () => {
        const lru = new LRU({
            max: 2,
            ttl: 100
        });

        lru.set('a', 1);
        lru.set('b', 2);

        coroutine.sleep(95);

        const results = [];
        for (let i = 0; i < 3; i++) {
            setImmediate(() => {
                try {
                    results.push(lru.get('a'));
                    results.push(lru.get('b'));
                } catch (error) {
                    results.push(error);
                }
            });
        }

        setImmediate(() => {
            lru.set('c', 3);  
        });

        coroutine.sleep(10);

        const aResults = results.filter((r, i) => i % 2 === 0);  
        const bResults = results.filter((r, i) => i % 2 === 1);  

        assert.ok(aResults.every(r => r === aResults[0]), "Results for key 'a' should be consistent");
        assert.ok(bResults.every(r => r === bResults[0]), "Results for key 'b' should be consistent");

        assert.ok(lru.size <= 2, "Cache size should not exceed max");

        let current = lru.first;
        let count = 0;
        while (current) {
            count++;
            current = current.next;
        }
        assert.equal(count, lru.size, "Linked list size should match cache size");
    });

    it("should handle TTL eviction race conditions", async () => {
        const lru = new LRU({ max: 3, ttl: 100 });
        
        lru.set('a', 1);
        lru.set('b', 2);
        lru.set('c', 3);
        
        await coroutine.sleep(90);
        
        const promises = [];
        
        for (let i = 0; i < 5; i++) {
            promises.push(coroutine.start(() => {
                const values = [];
                for (let j = 0; j < 10; j++) {
                    const key = String.fromCharCode(97 + Math.floor(Math.random() * 3)); 
                    const value = lru.get(key);
                    if (value !== undefined) {
                        values.push(value);
                    }
                    coroutine.sleep(2); 
                }
                return values;
            }));
        }
        
        for (let i = 0; i < 3; i++) {
            promises.push(coroutine.start(() => {
                for (let j = 0; j < 5; j++) {
                    const key = String.fromCharCode(97 + Math.floor(Math.random() * 3));
                    lru.set(key, Math.random());
                    coroutine.sleep(5);
                }
            }));
        }
        
        await Promise.all(promises);
        
        let count = 0;
        for (const key of ['a', 'b', 'c']) {
            if (lru.has(key)) {
                count++;
                const item = lru.items[key];
                
                if (item !== lru.last) {
                    assert(item.next !== null, `${key}.next should not be null if not last`);
                    assert.equal(item.next.prev, item, `${key}.next.prev should point back to item`);
                }
                if (item !== lru.first) {
                    assert(item.prev !== null, `${key}.prev should not be null if not first`);
                    assert.equal(item.prev.next, item, `${key}.prev.next should point back to item`);
                }
            }
        }
        
        assert.equal(lru.size, count);
    });

    it("should handle high concurrency operations", async () => {
        const lru = new LRU({ max: 100, ttl: 100 });
        const operations = 1000;
        const threads = 10;
        
        const results = new Set();
        const errors = [];
        
        const promises = [];
        for (let i = 0; i < threads; i++) {
            promises.push(coroutine.start(async () => {
                try {
                    for (let j = 0; j < operations / threads; j++) {
                        const op = Math.random();
                        const key = Math.floor(Math.random() * 20).toString(); 
                        
                        if (op < 0.4) { 
                            lru.set(key, Date.now());
                            await coroutine.sleep(1); 
                        } else if (op < 0.8) { 
                            const value = lru.get(key);
                            if (value !== undefined) {
                                results.add(key);
                            }
                        } else { 
                            lru.delete(key);
                        }
                    }
                } catch (e) {
                    errors.push(e);
                }
            }));
        }
        
        promises.push(coroutine.start(async () => {
            try {
                for (let i = 0; i < 10; i++) {
                    await coroutine.sleep(10);
                    lru.evict();
                }
            } catch (e) {
                errors.push(e);
            }
        }));
        
        await Promise.all(promises);
        
        assert.equal(errors.length, 0, `Encountered ${errors.length} errors: ${errors.join(', ')}`);
        
        let count = 0;
        for (const key in lru.items) {
            count++;
            const item = lru.items[key];
            
            assert.equal(item.owner, lru, `Item ${key} has incorrect owner`);
            
            if (item !== lru.last) {
                assert(item.next !== null, `Item ${key} next is null but not last`);
                assert.equal(item.next.prev, item, `Item ${key} next.prev not pointing back`);
            }
            if (item !== lru.first) {
                assert(item.prev !== null, `Item ${key} prev is null but not first`);
                assert.equal(item.prev.next, item, `Item ${key} prev.next not pointing back`);
            }
        }
        
        assert.equal(lru.size, count, "Cache size mismatch");
        
        assert(lru.size <= lru.max, "Cache exceeded max size");
        
        const now = Date.now();
        for (const key in lru.items) {
            const item = lru.items[key];
            if (item.expiry !== undefined) {
                assert(item.expiry > now, `Item ${key} expired but still in cache`);
            }
        }
    });
});
