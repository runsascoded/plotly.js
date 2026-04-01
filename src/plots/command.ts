import Registry from '../registry.js';
import { isPlainObject, log, nestedProperty, warn } from '../lib/index.js';

export var manageCommandObserver = function(gd?: any, container?: any, commandList?: any, onchange?: any): any {
    var ret: any = {};
    var enabled = true;

    if(container && container._commandObserver) {
        ret = container._commandObserver;
    }

    if(!ret.cache) {
        ret.cache = {};
    }

    // Either create or just recompute this:
    ret.lookupTable = {};

    var binding: any = hasSimpleAPICommandBindings(gd, commandList, ret.lookupTable);

    if(container && container._commandObserver) {
        if(!binding) {
            // If container exists and there are no longer any bindings,
            // remove existing:
            if(container._commandObserver.remove) {
                container._commandObserver.remove();
                container._commandObserver = null;
                return ret;
            }
        } else {
            // If container exists and there *are* bindings, then the lookup
            // table should have been updated and check is already attached,
            // so there's nothing to be done:
            return ret;
        }
    }

    // Determine whether there's anything to do for this binding:

    if(binding) {
        // Build the cache:
        bindingValueHasChanged(gd, binding, ret.cache);

        ret.check = function check() {
            if(!enabled) return;

            var update = bindingValueHasChanged(gd, binding, ret.cache);

            if(update.changed && onchange) {
                // Disable checks for the duration of this command in order to avoid
                // infinite loops:
                if(ret.lookupTable[update.value] !== undefined) {
                    ret.disable();
                    Promise.resolve(onchange({
                        value: update.value,
                        type: binding.type,
                        prop: binding.prop,
                        traces: binding.traces,
                        index: ret.lookupTable[update.value]
                    })).then(ret.enable, ret.enable);
                }
            }

            return update.changed;
        };

        var checkEvents = [
            'plotly_relayout',
            'plotly_redraw',
            'plotly_restyle',
            'plotly_update',
            'plotly_animatingframe',
            'plotly_afterplot'
        ];

        for(var i = 0; i < checkEvents.length; i++) {
            gd._internalOn(checkEvents[i], ret.check);
        }

        ret.remove = function() {
            for(var i = 0; i < checkEvents.length; i++) {
                gd._removeInternalListener(checkEvents[i], ret.check);
            }
        };
    } else {
        // TODO: It'd be really neat to actually give a *reason* for this, but at least a warning
        // is a start
        log('Unable to automatically bind plot updates to API command');

        ret.lookupTable = {};
        ret.remove = function() {};
    }

    ret.disable = function disable() {
        enabled = false;
    };

    ret.enable = function enable() {
        enabled = true;
    };

    if(container) {
        container._commandObserver = ret;
    }

    return ret;
};

export var hasSimpleAPICommandBindings = function(gd?: any, commandList?: any, bindingsByValue?: any): any {
    var i;
    var n = commandList.length;

    var refBinding;

    for(i = 0; i < n; i++) {
        var binding;
        var command = commandList[i];
        var method = command.method;
        var args = command.args;

        if(!Array.isArray(args)) args = [];

        // If any command has no method, refuse to bind:
        if(!method) {
            return false;
        }
        var bindings = computeAPICommandBindings(gd, method, args);

        // Right now, handle one and *only* one property being set:
        if(bindings.length !== 1) {
            return false;
        }

        if(!refBinding) {
            refBinding = bindings[0];
            if(Array.isArray(refBinding.traces)) {
                refBinding.traces.sort();
            }
        } else {
            binding = bindings[0];
            if(binding.type !== refBinding.type) {
                return false;
            }
            if(binding.prop !== refBinding.prop) {
                return false;
            }
            if(Array.isArray(refBinding.traces)) {
                if(Array.isArray(binding.traces)) {
                    binding.traces.sort();
                    for(var j = 0; j < refBinding.traces.length; j++) {
                        if(refBinding.traces[j] !== binding.traces[j]) {
                            return false;
                        }
                    }
                } else {
                    return false;
                }
            } else {
                if(binding.prop !== refBinding.prop) {
                    return false;
                }
            }
        }

        binding = bindings[0];
        var value: any = binding.value;
        if(Array.isArray(value)) {
            if(value.length === 1) {
                value = value[0];
            } else {
                return false;
            }
        }
        if(bindingsByValue) {
            bindingsByValue[value] = i;
        }
    }

    return refBinding;
};

function bindingValueHasChanged(gd?: any, binding?: any, cache?: any): any {
    var container, value, obj;
    var changed = false;

    if(binding.type === 'data') {
        // If it's data, we need to get a trace. Based on the limited scope
        // of what we cover, we can just take the first trace from the list,
        // or otherwise just the first trace:
        container = gd._fullData[binding.traces !== null ? binding.traces[0] : 0];
    } else if(binding.type === 'layout') {
        container = gd._fullLayout;
    } else {
        return false;
    }

    value = nestedProperty(container, binding.prop).get();

    obj = cache[binding.type] = cache[binding.type] || {};

    if(obj.hasOwnProperty(binding.prop)) {
        if(obj[binding.prop] !== value) {
            changed = true;
        }
    }

    obj[binding.prop] = value;

    return {
        changed: changed,
        value: value
    };
}

export var executeAPICommand = function(gd?: any, method?: any, args?: any): any {
    if(method === 'skip') return Promise.resolve();

    var _method = Registry.apiMethodRegistry[method];
    var allArgs = [gd];
    if(!Array.isArray(args)) args = [];

    for(var i = 0; i < args.length; i++) {
        allArgs.push(args[i]);
    }

    return _method.apply(null, allArgs).catch(function(err) {
        warn('API call to Plotly.' + method + ' rejected.', err);
        return Promise.reject(err);
    });
};

export var computeAPICommandBindings = function(gd?: any, method?: any, args?: any): any {
    var bindings;

    if(!Array.isArray(args)) args = [];

    switch(method) {
        case 'restyle':
            bindings = computeDataBindings(gd, args);
            break;
        case 'relayout':
            bindings = computeLayoutBindings(gd, args);
            break;
        case 'update':
            bindings = computeDataBindings(gd, [args[0], args[2]])
                .concat(computeLayoutBindings(gd, [args[1]]));
            break;
        case 'animate':
            bindings = computeAnimateBindings(gd, args);
            break;
        default:
            // This is the case where intelligent logic about what affects
            // this command is not implemented. It causes no ill effects.
            // For example, addFrames simply won't bind to a control component.
            bindings = [];
    }
    return bindings;
};

function computeAnimateBindings(gd?: any, args?: any): any {
    // We'll assume that the only relevant modification an animation
    // makes that's meaningfully tracked is the frame:
    if(Array.isArray(args[0]) && args[0].length === 1 && ['string', 'number'].indexOf(typeof args[0][0]) !== -1) {
        return [{type: 'layout', prop: '_currentFrame', value: args[0][0].toString()}];
    } else {
        return [];
    }
}

function computeLayoutBindings(gd?: any, args?: any): any {
    var bindings = [];

    var astr = args[0];
    var aobj: any = {};
    if(typeof astr === 'string') {
        aobj[astr] = args[1];
    } else if(isPlainObject(astr)) {
        aobj = astr;
    } else {
        return bindings;
    }

    crawl(aobj, function(path, attrName, attr) {
        bindings.push({type: 'layout', prop: path, value: attr});
    }, '', 0);

    return bindings;
}

function computeDataBindings(gd?: any, args?: any): any {
    var traces, astr, val, aobj;
    var bindings = [];

    // Logic copied from Plotly.restyle:
    astr = args[0];
    val = args[1];
    traces = args[2];
    aobj = {};
    if(typeof astr === 'string') {
        aobj[astr] = val;
    } else if(isPlainObject(astr)) {
        // the 3-arg form
        aobj = astr;

        if(traces === undefined) {
            traces = val;
        }
    } else {
        return bindings;
    }

    if(traces === undefined) {
        // Explicitly assign this to null instead of undefined:
        traces = null;
    }

    crawl(aobj, function(path, attrName, _attr) {
        var thisTraces;
        var attr;

        if(Array.isArray(_attr)) {
            attr = _attr.slice();

            var nAttr = Math.min(attr.length, gd.data.length);
            if(traces) {
                nAttr = Math.min(nAttr, traces.length);
            }
            thisTraces = [];
            for(var j = 0; j < nAttr; j++) {
                thisTraces[j] = traces ? traces[j] : j;
            }
        } else {
            attr = _attr;
            thisTraces = traces ? traces.slice() : null;
        }

        // Convert [7] to just 7 when traces is null:
        if(thisTraces === null) {
            if(Array.isArray(attr)) {
                attr = attr[0];
            }
        } else if(Array.isArray(thisTraces)) {
            if(!Array.isArray(attr)) {
                var tmp = attr;
                attr = [];
                for(var i = 0; i < thisTraces.length; i++) {
                    attr[i] = tmp;
                }
            }
            attr.length = Math.min(thisTraces.length, attr.length);
        }

        bindings.push({
            type: 'data',
            prop: path,
            traces: thisTraces,
            value: attr
        });
    }, '', 0);

    return bindings;
}

function crawl(attrs?: any, callback?: any, path?: any, depth?: any): void {
    Object.keys(attrs).forEach(function(attrName) {
        var attr: any = attrs[attrName];

        if(attrName[0] === '_') return;

        var thisPath = path + (depth > 0 ? '.' : '') + attrName;

        if(isPlainObject(attr)) {
            crawl(attr, callback, thisPath, depth + 1);
        } else {
            // Only execute the callback on leaf nodes:
            callback(thisPath, attrName, attr);
        }
    });
}

export default { manageCommandObserver, hasSimpleAPICommandBindings, executeAPICommand, computeAPICommandBindings };
