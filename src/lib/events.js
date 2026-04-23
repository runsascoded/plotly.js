// Minimal EventEmitter (replaces Node.js 'events' package, ~15 KB)
class MiniEmitter {
    constructor() {
        this._events = {};
    }
    on(event, fn) {
        const handlers = this._events[event];
        if (!handlers)
            this._events[event] = fn;
        else if (typeof handlers === 'function')
            this._events[event] = [handlers, fn];
        else
            handlers.push(fn);
        return this;
    }
    once(event, fn) {
        const self = this;
        function wrapper(...args) {
            self.removeListener(event, wrapper);
            fn.apply(this, args);
        }
        wrapper.listener = fn;
        return this.on(event, wrapper);
    }
    removeListener(event, fn) {
        const handlers = this._events[event];
        if (!handlers)
            return this;
        if (typeof handlers === 'function') {
            if (handlers === fn || handlers.listener === fn)
                delete this._events[event];
        }
        else {
            for (let i = handlers.length - 1; i >= 0; i--) {
                if (handlers[i] === fn || handlers[i].listener === fn) {
                    handlers.splice(i, 1);
                    break;
                }
            }
            if (handlers.length === 0)
                delete this._events[event];
            else if (handlers.length === 1)
                this._events[event] = handlers[0];
        }
        return this;
    }
    removeAllListeners(event) {
        if (event)
            delete this._events[event];
        else
            this._events = {};
        return this;
    }
    emit(event, data) {
        const handlers = this._events[event];
        if (!handlers)
            return false;
        if (typeof handlers === 'function')
            handlers.call(this, data);
        else {
            const arr = handlers.slice();
            for (let i = 0; i < arr.length; i++)
                arr[i].call(this, data);
        }
        return true;
    }
    /** Match Node's EventEmitter API — used by `plot_api.react()` to save and
     *  restore user listeners across a config-change-triggered `newPlot`. */
    eventNames() {
        return Object.keys(this._events);
    }
    listeners(event) {
        const handlers = this._events[event];
        if (!handlers)
            return [];
        return typeof handlers === 'function' ? [handlers] : handlers.slice();
    }
}
const Events = {
    init: function (plotObj) {
        if (plotObj._ev instanceof MiniEmitter)
            return plotObj;
        const ev = new MiniEmitter();
        const internalEv = new MiniEmitter();
        /*
         * Assign to plot._ev while we still live in a land
         * where plot is a DOM element with stuff attached to it.
         * In the future we can make plot the event emitter itself.
         */
        plotObj._ev = ev;
        /*
         * Create a second event handler that will manage events *internally*.
         * This allows parts of plotly to respond to thing like relayout without
         * having to use the user-facing event handler. They cannot peacefully
         * coexist on the same handler because a user invoking
         * plotObj.removeAllListeners() would detach internal events, breaking
         * plotly.
         */
        plotObj._internalEv = internalEv;
        /*
         * Assign bound methods from the ev to the plot object. These methods
         * will reference the 'this' of plot._ev even though they are methods
         * of plot. This will keep the event machinery away from the plot object
         * which currently is often a DOM element but presents an API that will
         * continue to function when plot becomes an emitter. Not all EventEmitter
         * methods have been bound to `plot` as some do not currently add value to
         * the Plotly event API.
         */
        plotObj.on = ev.on.bind(ev);
        plotObj.once = ev.once.bind(ev);
        plotObj.removeListener = ev.removeListener.bind(ev);
        plotObj.removeAllListeners = ev.removeAllListeners.bind(ev);
        /*
         * Create functions for managing internal events. These are *only* triggered
         * by the mirroring of external events via the emit function.
         */
        plotObj._internalOn = internalEv.on.bind(internalEv);
        plotObj._internalOnce = internalEv.once.bind(internalEv);
        plotObj._removeInternalListener = internalEv.removeListener.bind(internalEv);
        plotObj._removeAllInternalListeners = internalEv.removeAllListeners.bind(internalEv);
        plotObj.emit = function (event, data) {
            ev.emit(event, data);
            internalEv.emit(event, data);
        };
        /*
        * Add a dummy event handler for 'wheel' event for Safari
        * to enable mouse wheel zoom.
        * https://github.com/d3/d3/issues/3035
        * https://github.com/plotly/plotly.js/issues/7452
        *
        * We set {passive: true} for better performance
        * and to avoid a Violation warning in Chromium.
        * https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
        * https://github.com/plotly/plotly.js/issues/7516
        */
        if (typeof plotObj.addEventListener === 'function') {
            plotObj.addEventListener("wheel", () => { }, { passive: true });
        }
        return plotObj;
    },
    /*
     * This function behaves like jQuery's triggerHandler. It calls
     * all handlers for a particular event and returns the return value
     * of the LAST handler.
     */
    triggerHandler: function (plotObj, event, data) {
        let nodeEventHandlerValue;
        /*
         * Now run all the node style event handlers
         */
        const ev = plotObj._ev;
        if (!ev)
            return;
        let handlers = ev._events[event];
        if (!handlers)
            return;
        // making sure 'this' is the EventEmitter instance
        function apply(handler) {
            // The 'once' case, we can't just call handler() as we need
            // the return value here. So,
            // - remove handler
            // - call listener and grab return value!
            // - stash 'fired' key to not call handler twice
            if (handler.listener) {
                ev.removeListener(event, handler.listener);
                if (!handler.fired) {
                    handler.fired = true;
                    return handler.listener.apply(ev, [data]);
                }
            }
            else {
                return handler.apply(ev, [data]);
            }
        }
        // handlers can be function or an array of functions
        handlers = Array.isArray(handlers) ? handlers : [handlers];
        let i;
        for (i = 0; i < handlers.length - 1; i++) {
            apply(handlers[i]);
        }
        // now call the final handler and collect its value
        nodeEventHandlerValue = apply(handlers[i]);
        return nodeEventHandlerValue;
    },
    purge: function (plotObj) {
        delete plotObj._ev;
        delete plotObj.on;
        delete plotObj.once;
        delete plotObj.removeListener;
        delete plotObj.removeAllListeners;
        delete plotObj.emit;
        delete plotObj._ev;
        delete plotObj._internalEv;
        delete plotObj._internalOn;
        delete plotObj._internalOnce;
        delete plotObj._removeInternalListener;
        delete plotObj._removeAllInternalListeners;
        return plotObj;
    }
};
export default Events;
