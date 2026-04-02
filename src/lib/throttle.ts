interface ThrottleCache {
    ts: number;
    timer: ReturnType<typeof setTimeout> | null;
    onDone?: (() => void) | null;
}

const timerCache: Record<string, ThrottleCache> = {};

export function throttle(id: string, minInterval: number, callback: () => void): void {
    let cache = timerCache[id];
    const now = Date.now();

    if(!cache) {
        /*
         * Throw out old items before making a new one, to prevent the cache
         * getting overgrown, for example from old plots that have been replaced.
         * 1 minute age is arbitrary.
         */
        for(const idi in timerCache) {
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
}

export function done(id: string): Promise<void> {
    const cache = timerCache[id];
    if(!cache || !cache.timer) return Promise.resolve();

    return new Promise(function(resolve) {
        const previousOnDone = cache.onDone;
        cache.onDone = function onDone() {
            if(previousOnDone) previousOnDone();
            resolve();
            cache.onDone = null;
        };
    });
}

export function clear(id?: string): void {
    if(id) {
        _clearTimeout(timerCache[id]);
        delete timerCache[id];
    } else {
        for(const idi in timerCache) clear(idi);
    }
}

function _clearTimeout(cache: ThrottleCache | undefined): void {
    if(cache && cache.timer !== null) {
        clearTimeout(cache.timer);
        cache.timer = null;
    }
}

export default { throttle, done, clear };
