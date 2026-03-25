var timerCache = {};

export var throttle = function throttle(id, minInterval, callback) {
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

    function exec() {
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

export var done = function(id) {
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

export var clear = function(id) {
    if(id) {
        _clearTimeout(timerCache[id]);
        delete timerCache[id];
    } else {
        for(var idi in timerCache) clear(idi);
    }
};

function _clearTimeout(cache) {
    if(cache && cache.timer !== null) {
        clearTimeout(cache.timer);
        cache.timer = null;
    }
}

export default { throttle, done, clear };
