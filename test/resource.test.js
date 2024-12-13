const test = require('test');
test.setup();

const assert = require('assert');
const coroutine = require('coroutine');
const LRU = require('../lib').LRU;

describe("Resource Management", () => {
    it("should manage cache size correctly", () => {
        const lru = new LRU({ max: 1000 });
        const itemCount = 100;
        
        for (let i = 0; i < itemCount; i++) {
            lru.set(`key${i}`, `value${i}`);
        }
        assert.equal(lru.size, itemCount, "Cache should contain all items");
        
        const deleteCount = itemCount / 2;
        for (let i = 0; i < deleteCount; i++) {
            lru.delete(`key${i}`);
        }
        
        assert.equal(lru.size, itemCount - deleteCount, "Cache size should decrease after deletion");
        
        for (let i = 0; i < deleteCount; i++) {
            assert(!lru.has(`key${i}`), `Deleted item key${i} should not exist`);
        }
        
        for (let i = deleteCount; i < itemCount; i++) {
            assert(lru.has(`key${i}`), `Remaining item key${i} should exist`);
            assert.equal(lru.get(`key${i}`), `value${i}`, `Remaining item key${i} should have correct value`);
        }
    });
    
    it("should enforce max size limit", () => {
        const maxSize = 10;
        const lru = new LRU({ max: maxSize });
        const totalItems = maxSize * 2;
        
        for (let i = 0; i < totalItems; i++) {
            lru.set(`key${i}`, `value${i}`);
        }
        
        assert.equal(lru.size, maxSize, "Cache size should not exceed max");
        
        for (let i = 0; i < totalItems - maxSize; i++) {
            assert(!lru.has(`key${i}`), `Older item key${i} should be evicted`);
        }
        for (let i = totalItems - maxSize; i < totalItems; i++) {
            assert(lru.has(`key${i}`), `Newer item key${i} should be kept`);
            assert.equal(lru.get(`key${i}`), `value${i}`, `Newer item key${i} should have correct value`);
        }
        
        const lastKey = `key${totalItems - 1}`;
        const lastValue = `value${totalItems - 1}`;
        lru.get(lastKey); 
        lru.set('newKey', 'newValue'); 
        assert(lru.has(lastKey), "Recently accessed item should not be evicted");
        assert.equal(lru.get(lastKey), lastValue, "Recently accessed item should maintain its value");
    });
    
    it("should handle TTL expiration correctly", async () => {
        const ttl = 100;
        const lru = new LRU({ max: 100, ttl: ttl });
        const itemCount = 50;
        
        for (let i = 0; i < itemCount; i++) {
            lru.set(`key${i}`, `value${i}`);
        }
        assert.equal(lru.size, itemCount, "Cache should contain all items initially");
        
        await coroutine.sleep(ttl / 2);
        assert.equal(lru.size, itemCount, "Items should not expire before TTL");
        
        for (let i = itemCount / 2; i < itemCount; i++) {
            assert.equal(lru.get(`key${i}`), `value${i}`, "Items should be accessible before TTL");
        }
        
        await coroutine.sleep(ttl + 10);
        
        lru.get('key0');
        
        for (let i = 0; i < itemCount / 2; i++) {
            assert(!lru.has(`key${i}`), `Expired item key${i} should be removed`);
        }
        
        let remainingCount = 0;
        for (let i = itemCount / 2; i < itemCount; i++) {
            if (lru.has(`key${i}`)) {
                remainingCount++;
                assert.equal(lru.get(`key${i}`), `value${i}`, `Refreshed item key${i} should maintain its value`);
            }
        }
        
        assert.equal(lru.size, remainingCount, "Cache size should reflect the number of non-expired items");
    });
});
