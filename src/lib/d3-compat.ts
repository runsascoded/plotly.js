/**
 * Minimal d3 v7 compatibility shim.
 *
 * Only remaining patch: .attr() getter on empty selection returns undefined
 * instead of crashing (d3 v3 behavior).
 *
 * All other v3 polyfills have been removed — call sites converted to v7 native:
 * - .style({obj}) / .attr({obj}) → individual calls
 * - enter/update auto-merge → explicit .merge()
 * - .select() data propagation → querySelector in ensureSingle
 */
import { selection } from 'd3-selection';
import 'd3-transition';

const _origAttr = (selection.prototype as any).attr;
(selection.prototype as any).attr = function(this: any, name: any, value?: any): any {
    if(arguments.length === 1 && typeof name === 'string' && !this.node()) {
        return undefined;
    }
    return _origAttr.apply(this, arguments);
};
