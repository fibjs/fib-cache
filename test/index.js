const { describe } = require('node:test');

describe('LRU Cache Tests', () => {
    require('./basic.test.js');
    require('./ttl.test.js');
    require('./resolver.test.js');
    require('./concurrency.test.js');
    require('./resource.test.js');
});
