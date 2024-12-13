# LRU Cache for fibjs

A high-performance, thread-safe LRU (Least Recently Used) cache implementation for fibjs with TTL support and resolver functionality.

## Features

- **Size-based Eviction**: Automatically removes least recently used items when cache reaches its maximum size
- **TTL Support**: Time-based expiration for cache entries
- **Thread Safety**: Safe for concurrent access in multi-fiber environments
- **Resolver Function**: Automatic value resolution for cache misses
- **Resource Management**: Efficient memory usage and automatic cleanup
- **High Performance**: Optimized for both read and write operations

## Installation

```sh
fibjs --install fib-cache
```

## Basic Usage

```javascript
const { LRU } = require('fib-cache');

// Create a cache with max 100 items and 5s TTL
const cache = new LRU({ 
    max: 100,
    ttl: 5000 
});

// Basic operations
cache.set('key1', 'value1');
console.log(cache.get('key1')); // 'value1'

// The item will be automatically removed after 5 seconds
coroutine.sleep(5000);
console.log(cache.get('key1')); // undefined
```

## Advanced Usage

### Using Resolver Function

```javascript
const cache = new LRU({
    max: 1000,
    ttl: 3600000, // 1 hour
    resolver: (key) => {
        // Automatically fetch value if not in cache
        const value = fetchDataFromDatabase(key);
        return value;
    }
});

// Will automatically fetch from database if not in cache
const value = cache.get('user:123');

// Example with sleep
const slowCache = new LRU({
    max: 100,
    resolver: (key) => {
        // Simulate slow operation
        coroutine.sleep(100);
        return `computed_${key}`;
    }
});

// This will wait for resolver
console.log(slowCache.get('test')); // 'computed_test'
```

### Managing Cache Size

```javascript
const cache = new LRU({ max: 2 });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3); // 'a' will be evicted

console.log(cache.get('a')); // undefined
console.log(cache.get('b')); // 2
console.log(cache.get('c')); // 3
```

## API Reference

### Constructor Options

- `max` (number, optional): Maximum number of items in cache. Default: 0 (no limit)
- `ttl` (number, optional): Time-to-live in milliseconds. Default: 0 (no expiration)
- `resolver` (Function, optional): Function to resolve cache misses

### Methods

#### Basic Operations

- `get(key, [resolver])`: Get value by key
  - `key`: The key to look up
  - `resolver` (optional): A one-time resolver function for this specific get operation
- `set(key, value)`: Set value for key
- `delete(key)`: Remove item by key
- `has(key)`: Check if key exists
- `clear()`: Remove all items

#### Cache Information

- `keys()`: Get all keys
- `values()`: Get all values
- `entries()`: Get all key-value pairs
- `size`: Get current cache size

## Thread Safety

The cache is designed to be thread-safe in fibjs environment:

```javascript
const cache = new LRU({ max: 100 });

// Safe for concurrent access
coroutine.parallel([
    () => cache.set('key1', 'value1'),
    () => cache.get('key1'),
    () => cache.delete('key1')
]);
```

## Performance Considerations

- Cache operations are O(1) for get/set operations
- Automatic cleanup of expired items during operations
- Efficient memory usage with proper garbage collection
- Thread-safe operations with minimal locking

## Using Resolver Function

```javascript
const cache = new LRU({
    max: 1000,
    ttl: 3600000, // 1 hour
    // Default resolver
    resolver: (key) => {
        return fetchFromMainDB(key);
    }
});

// Using default resolver
const value1 = cache.get('user:123');

// Using one-time custom resolver
const value2 = cache.get('user:456', (key) => {
    return fetchFromBackupDB(key);
});

// Example with different resolvers
const slowCache = new LRU({
    max: 100,
    // Default slow resolver
    resolver: (key) => {
        coroutine.sleep(100);
        return `slow_${key}`;
    }
});

// Using default slow resolver
console.log(slowCache.get('test')); // 'slow_test'

// Using fast one-time resolver
console.log(slowCache.get('test', key => `fast_${key}`)); // 'fast_test'
```

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.