interface ThrottleCache {
    ts: number;
    timer: ReturnType<typeof setTimeout> | null;
    onDone?: (() => void) | null;
}

var timerCache: Record<string, ThrottleCache> = {};

export var throttle = function throttle(id: string, minInterval: number, callback: () => void): void {
    var cache = timerCache[id];
    var now = Date.now();

    if(!cache) {
        /*
         * Throw out old items before making a new one, to prevent the cache
         * getting overgrown, for example from old plots that have been replaced.
         * 1 minute age is arbitrary.
         */
        for(var idi in timerCache) {
            if(timerCache[idi].ts < now - 60000) {
                delete timerCache[idi];
            }
        }
        cache = timerCache[id] = {ts: 0, timer: null};
    }

    _clearTimeout(cache);

    function exec(): void {
        callback();
        cache.ts = Date.now();
        if(cache.onDone) {
            cache.onDone();
            cache.onDone = null;
        }
    }

    if(now > cache.ts + minInterval) {
        exec();
        return;
    }

    cache.timer = setTimeout(function() {
        exec();
        cache.timer = null;
    }, minInterval);
};

export var done = function(id: string): Promise<void> {
    var cache = timerCache[id];
    if(!cache || !cache.timer) return Promise.resolve();

    return new Promise(function(resolve) {
        var previousOnDone = cache.onDone;
        cache.onDone = function onDone() {
            if(previousOnDone) previousOnDone();
            resolve();
            cache.onDone = null;
        };
    });
};

export var clear = function(id?: string): void {
    if(id) {
        _clearTimeout(timerCache[id]);
        delete timerCache[id];
    } else {
        for(var idi in timerCache) clear(idi);
    }
};

function _clearTimeout(cache: ThrottleCache | undefined): void {
    if(cache && cache.timer !== null) {
        clearTimeout(cache.timer);
        cache.timer = null;
    }
}

export default { throttle, done, clear };
