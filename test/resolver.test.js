const { describe, it, oit } = require('node:test');
const assert = require('assert');
const { LRU } = require('..');
const coroutine = require('coroutine');

describe('Resolver Tests', () => {
    describe("test resolver", () => {
        it("normal test", () => {
            var resolve_count = 0;
            const lru = new LRU({
                max: 2,
                resolver: (key) => {
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
                resolver: (key) => {
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
                resolver: (key) => {
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

    it("test max size with resolver", () => {
        let resolveCount = 0;
        const lru = new LRU({
            max: 2,
            resolver: (key) => {
                resolveCount++;
                return key + resolveCount;
            }
        });

        assert.equal(lru.get('a'), 'a1');  
        assert.equal(lru.get('b'), 'b2');  

        assert.equal(lru.get('c'), 'c3');  

        assert.equal(lru.get('a'), 'a4');  
        assert.equal(resolveCount, 4);

        assert.equal(lru.get('c'), 'c3');  
        assert.equal(lru.get('b'), 'b5');  
        assert.equal(resolveCount, 5);
    });

    it("should handle resolver exceptions correctly", () => {
        let resolveCount = 0;
        const lru = new LRU({
            max: 2,
            resolver: () => {
                resolveCount++;
                throw new Error('resolver error');
            }
        });

        try {
            lru.get('a');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.equal(error.message, 'resolver error');
        }

        assert.equal(lru.size, 0);  
        assert.equal(resolveCount, 1);  
        assert.equal(lru.has('a'), false);  
    });

    it("should handle resolver errors without causing state inconsistency", () => {
        let resolveCount = 0;
        const lru = new LRU({
            max: 2,
            resolver: (key) => {
                resolveCount++;
                throw new Error('resolver error');
            }
        });

        try {
            lru.get('a');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.equal(error.message, 'resolver error');
        }

        assert.equal(lru.size, 0);  
        assert.equal(resolveCount, 1);  
        assert.equal(lru.has('a'), false);  
        assert.equal('a' in lru.items, false);  

        try {
            lru.get('a');
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.equal(error.message, 'resolver error');
        }

        assert.equal(lru.size, 0);
        assert.equal(resolveCount, 2);
        assert.equal(lru.has('a'), false);
        assert.equal('a' in lru.items, false);
    });

    it("should handle resolver errors with concurrent access", () => {
        let resolveCount = 0;
        const lru = new LRU({
            max: 2,
            resolver: (key) => {
                resolveCount++;
                coroutine.sleep(10);  
                throw new Error('resolver error');
            }
        });

        const fibers = [];
        const errors = [];
        const results = [];
        
        for (let i = 0; i < 3; i++) {
            fibers.push(coroutine.start(() => {
                try {
                    results.push(lru.get('a'));
                } catch (error) {
                    errors.push(error);
                }
            }));
        }

        fibers.forEach(f => f.join());

        assert.equal(resolveCount, 1);  
        assert.equal(errors.length, 3);  
        errors.forEach(error => {
            assert.equal(error.message, 'resolver error');
        });
        assert.equal(results.length, 0);  
        assert.equal(lru.size, 0);  
        assert.equal('a' in lru.items, false);  
    });

    it("should handle concurrent resolver access correctly", () => {
        let resolveCount = 0;
        const lru = new LRU({
            max: 2,
            resolver: (key) => {
                resolveCount++;
                coroutine.sleep(10);  
                if (resolveCount === 1) {
                    throw new Error('first resolver error');
                }
                return key + resolveCount;
            }
        });

        let results = [];
        let errors = [];
        
        for (let i = 0; i < 3; i++) {
            setImmediate(() => {
                try {
                    results.push(lru.get('a'));
                } catch (error) {
                    errors.push(error);
                }
            });
        }

        coroutine.sleep(50);  

        assert.equal(resolveCount, 1);  
        assert.equal(errors.length, 3);  
        errors.forEach(error => {
            assert.equal(error.message, 'first resolver error');  
        });
        assert.equal(results.length, 0);  
        assert.equal(lru.size, 0);  
        assert.equal('a' in lru.items, false);  

        const value = lru.get('a');
        assert.equal(value, 'a2');  
        assert.equal(resolveCount, 2);  
    });

    it("should handle one-time resolver correctly", () => {
        let defaultResolverCount = 0;
        let customResolverCount = 0;

        const lru = new LRU({
            max: 2,
            resolver: (key) => {
                defaultResolverCount++;
                return `default_${key}`;
            }
        });

        const value1 = lru.get('a', (key) => {
            customResolverCount++;
            return `custom_${key}`;
        });

        const value2 = lru.get('b');

        const value3 = lru.get('a');
        const value4 = lru.get('b');

        assert.equal(value1, 'custom_a', "Custom resolver should return custom value");
        assert.equal(value2, 'default_b', "Default resolver should return default value");
        assert.equal(value3, 'custom_a', "Cached custom value should persist");
        assert.equal(value4, 'default_b', "Cached default value should persist");

        assert.equal(defaultResolverCount, 1, "Default resolver should be called once");
        assert.equal(customResolverCount, 1, "Custom resolver should be called once");
    });

    it("should handle one-time resolver errors correctly", () => {
        const lru = new LRU({
            max: 2,
            resolver: (key) => `default_${key}`
        });

        try {
            lru.get('a', () => {
                throw new Error('custom resolver error');
            });
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.equal(error.message, 'custom resolver error');
        }

        assert.equal(lru.has('a'), false);  
        
        const value = lru.get('a');
        assert.equal(value, 'default_a');
    });

    it("should handle concurrent one-time resolvers", () => {
        const lru = new LRU({
            max: 2,
            resolver: (key) => {
                coroutine.sleep(50);
                return `default_${key}`;
            }
        });

        const results = [];
        const errors = [];

        const fibers = [];
        for (let i = 0; i < 3; i++) {
            fibers.push(coroutine.start(() => {
                try {
                    const customResolver = (key) => {
                        coroutine.sleep(10);  
                        return `custom${i}_${key}`;
                    };
                    results.push(lru.get('a', customResolver));
                } catch (error) {
                    errors.push(error);
                }
            }));
        }

        fibers.forEach(f => f.join());

        assert.equal(errors.length, 0, "Should not have any errors");
        assert.equal(results.length, 3, "Should have three results");
        
        const firstResult = results[0];
        results.forEach(result => {
            assert.equal(result, firstResult, "All concurrent requests should get the same result");
        });

        assert.equal(lru.get('a'), firstResult, "Cached value should match first resolver's result");
    });

    it("should prioritize one-time resolver over default", () => {
        let defaultResolverCalled = false;
        const lru = new LRU({
            max: 2,
            resolver: () => {
                defaultResolverCalled = true;
                return 'default';
            }
        });

        const value = lru.get('key', () => 'custom');
        
        assert.equal(value, 'custom', "Should use custom resolver's value");
        assert.equal(defaultResolverCalled, false, "Should not call default resolver");
    });
});
