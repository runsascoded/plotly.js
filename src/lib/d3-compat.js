/**
 * d3 v3 → v7 compatibility polyfill.
 *
 * Patches Selection.prototype to handle v3 patterns:
 * - .style({key: val, ...}) and .attr({key: val, ...}) object form (removed in v4)
 * - .attr('name') getter on empty selections (v3 returns undefined, v7 crashes)
 * - Ensures d3-transition is loaded (extends Selection.prototype.transition)
 */
import { selection } from 'd3-selection';
import 'd3-transition';

var _origStyle = selection.prototype.style;
var _origAttr = selection.prototype.attr;

// Patch .style() to accept object arg
selection.prototype.style = function(nameOrObj, value, priority) {
    if(typeof nameOrObj === 'object' && nameOrObj !== null) {
        for(var key in nameOrObj) {
            _origStyle.call(this, key, nameOrObj[key]);
        }
        return this;
    }
    return _origStyle.apply(this, arguments);
};

// Patch .attr() to accept object arg AND handle null-node getters
selection.prototype.attr = function(nameOrObj, value) {
    // Object form: .attr({key: val, ...})
    if(typeof nameOrObj === 'object' && nameOrObj !== null && !(nameOrObj instanceof String)) {
        for(var key in nameOrObj) {
            _origAttr.call(this, key, nameOrObj[key]);
        }
        return this;
    }
    // Getter form with no node: return undefined (v3 compat) instead of crashing
    if(arguments.length === 1 && !this.node()) {
        return undefined;
    }
    return _origAttr.apply(this, arguments);
};
