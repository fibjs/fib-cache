const conroutine = require('coroutine');

class LRU {
    constructor(opt = {
        max: 0,
        ttl: 0
    }) {
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

    delete_item(item) {
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
        }

        return this;
    }

    delete(key) {
        const item = this.items[key];
        if (item)
            this.delete_item(item);
        return this;
    }

    entries(keys = this.keys()) {
        return keys.map(key => [key, this.get(key)]);
    }

    evict() {
        while (this.size >= this.max) {
            this.delete_item(this.first);
        }

        if (this.ttl > 0) {
            while (this.size > 0) {
                const item = this.first;

                if (item.expiry > Date.now()) {
                    break;
                }

                this.delete_item(item);
            }
        }

        return this;
    }

    get(key) {
        let result;

        const item = this.items[key];
        if (!item) {
            if (this.resolver) {
                const item = this.new_item(key);
                try {
                    item.value = this.resolver(key);
                } finally {
                    if (item.value === undefined)
                        this.delete_item(item);
                    item.ready.set();
                }
                return item.value;
            }
            return undefined;
        }

        item.ready.wait();
        if (this.ttl > 0 && item.expiry <= Date.now()) {
            this.delete_item(item);
        } else {
            result = item.value;
            if (item.owner === this)
                this.order_item(item);
        }

        return result;
    }

    has(key) {
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

    new_item(key, value) {
        if (this.max > 0) {
            this.evict();
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

    order_item(item) {
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
            item.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
            this.order_item(item);
        } else {
            item = this.new_item(key, value);
            item.ready.set();
        }

        return this;
    }

    values(keys = this.keys()) {
        return keys.map(key => this.get(key));
    }
}

exports.LRU = LRU;
