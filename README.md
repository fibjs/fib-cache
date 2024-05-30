# LRU Cache for fibjs
This module provides an implementation of a Least Recently Used (LRU) cache in JavaScript. The LRU cache is a type of cache in which the least recently used entries are removed when the cache's limit has been reached.

## Install
```sh
fibjs --install fib-cache
```

## Usage
```JavaScript
const { LRU } = require('fib-cache');

const cache = new LRU({ max: 100, ttl: 5000 });

cache.set('key1', 'value1');
console.log(cache.get('key1')); // 'value1'
```
## Class: LRU
The main class exported by this module is `LRU`. An instance of LRU represents a cache with a specified maximum size and time-to-live (TTL) for its entries.

## Constructor
The LRU class is instantiated with an options object. The options object can have the following properties:

`max`: The maximum number of entries in the cache. If not specified, the cache size is unlimited.
`ttl`: The time-to-live (in milliseconds) for each entry. If not specified, entries do not expire.
`solver`: A function that will be called to compute the value for a key if it's not in the cache.

## Methods
The LRU class provides the following methods:

`clear()`: Clears the cache.
`delete(key)`: Deletes the entry with the specified key from the cache.
`entries()`: Returns an array of all entries in the cache.
`evict()`: Evicts entries from the cache until it's within its size limit and all remaining entries are within their TTL.
`get(key)`: Returns the value of the entry with the specified key.
`has(key)`: Checks if an entry with the specified key exists in the cache.
`keys()`: Returns an array of all keys in the cache.
`set(key, value)`: Sets the value of the entry with the specified key.
`values()`: Returns an array of all values in the cache.

## Using the Solver Function in LRU Cache
The solver function is a powerful feature of the LRU Cache module. It allows you to compute the value for a key if it's not already in the cache. This function is called automatically when you try to get a value for a key that doesn't exist in the cache.

When creating a new instance of the LRU Cache, you can pass a solver function in the options object:
```JavaScript
const lru = new LRU({
    max: 2,
    solver: (key) => {
        // Compute the value for the key
        return computedValue;
    }
});
```
The solver function receives the key as its argument and should return the computed value for that key.