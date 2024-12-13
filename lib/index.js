const conroutine = require('coroutine');

class LRU {
    constructor(opt = {}) {
        // 设置默认值
        opt.max = opt.max === undefined ? 0 : opt.max;
        opt.ttl = opt.ttl === undefined ? 0 : opt.ttl;

        // 验证 max 参数
        if (typeof opt.max !== 'number') {
            throw new TypeError('max must be a number');
        }
        if (opt.max < 0) {
            throw new RangeError('max must be a non-negative number');
        }

        // 验证 ttl 参数
        if (typeof opt.ttl !== 'number') {
            throw new TypeError('ttl must be a number');
        }
        if (opt.ttl < 0) {
            throw new RangeError('ttl must be a non-negative number');
        }

        // 验证 resolver 参数
        if (opt.resolver !== undefined && typeof opt.resolver !== 'function') {
            throw new TypeError('resolver must be a function');
        }

        this.items = Object.create(null);
        this.size = 0;

        this.first = null;
        this.last = null;

        this.max = opt.max;
        this.ttl = opt.ttl;
        this.resolver = opt.resolver;
    }

    clear() {
        this.first = null;
        this.items = Object.create(null);
        this.last = null;
        this.size = 0;

        return this;
    }

    _deleteItem(item) {
        if (item.owner === this) {
            delete this.items[item.key];
            delete item.owner;
            this.size--;

            if (this.first === item)
                this.first = item.next;
            else
                item.prev.next = item.next;

            if (this.last === item)
                this.last = item.prev;
            else
                item.next.prev = item.prev;

            item.prev = null;
            item.next = null;
            item.ready.set();
        }

        return this;
    }

    delete(key) {
        const item = this.items[key];
        if (item)
            this._deleteItem(item);
        return this;
    }

    entries(keys = this.keys()) {
        return keys.map(key => [key, this.get(key)]);
    }

    _evict() {
        while (this.size >= this.max) {
            this._deleteItem(this.first);
        }

        if (this.ttl > 0) {
            while (this.size > 0) {
                const item = this.first;

                if (item.expiry > Date.now()) {
                    break;
                }

                this._deleteItem(item);
            }
        }

        return this;
    }

    get(key, resolver) {
        let result;

        const item = this.items[key];
        if (!item) {
            const resolverFn = resolver || this.resolver;
            if (resolverFn) {
                const item = this._newItem(key);
                try {
                    item.value = resolverFn(key);
                } catch (error) {
                    this._deleteItem(item);
                    item.error = error;  
                    throw error;
                } finally {
                    item.ready.set();  
                }
                return item.value;
            }
            return undefined;
        }

        item.ready.wait();
        if (this.ttl > 0 && item.expiry <= Date.now()) {
            this._deleteItem(item);
        } else if (item.error) {  
            throw item.error;
        } else {
            result = item.value;
            if (item.owner === this)
                this._orderItem(item);
        }

        return result;
    }

    has(key) {
        const item = this.items[key];
        if (item && this.ttl > 0 && item.expiry <= Date.now()) {
            this._deleteItem(item);
            return false;
        }
        return key in this.items;
    }

    keys() {
        const result = [];
        let x = this.first;

        while (x !== null) {
            result.push(x.key);
            x = x.next;
        }

        return result;
    }

    _newItem(key, value) {
        if (this.max > 0) {
            this._evict();
        }

        let item = this.items[key] = {
            expiry: this.ttl > 0 ? Date.now() + this.ttl : undefined,
            key: key,
            prev: this.last,
            next: null,
            owner: this,
            value,
            ready: new conroutine.Event()
        };

        if (++this.size === 1)
            this.first = item;
        else
            this.last.next = item;

        this.last = item;

        return item;
    }

    _orderItem(item) {
        if (this.last !== item) {
            item.next.prev = item.prev;

            if (this.first === item)
                this.first = item.next;
            else
                item.prev.next = item.next;

            this.last.next = item;
            item.prev = this.last;
            item.next = null;
            this.last = item;
        }
    }

    set(key, value) {
        let item = this.items[key];

        if (item) {
            item.value = value;
            item.expiry = this.ttl > 0 ? Date.now() + this.ttl : undefined;
            this._orderItem(item);
        } else {
            item = this._newItem(key, value);
            item.ready.set();
        }

        return this;
    }

    values(keys = this.keys()) {
        return keys.map(key => this.get(key));
    }
}

exports.LRU = LRU;
