/**
 * d3 v3 → v7 compatibility polyfill.
 *
 * Patches Selection.prototype to handle v3 patterns:
 * - .style({key: val, ...}) and .attr({key: val, ...}) object form (removed in v4)
 * - .attr('name') getter on empty selections (v3 returns undefined, v7 crashes)
 * - Enter/update auto-merge: in v3, enter().append() auto-merged into the update
 *   selection. In v4+, they're separate and require explicit .merge(). This polyfill
 *   restores v3 behavior so that the update selection includes entered nodes.
 * - .select() data propagation: v4+ propagates parent data to children via .select(),
 *   v3 did not. Patched to preserve children's existing data.
 * - Ensures d3-transition is loaded (extends Selection.prototype.transition)
 */
import { selection } from 'd3-selection';
import 'd3-transition';

const _origEnter = (selection.prototype as any).enter;
const _origSelect = (selection.prototype as any).select;

// Patch .select() to NOT propagate parent data to child (v3 behavior).
// In d3 v4+, select() copies parent.__data__ to child.__data__, which breaks
// plotly.js code that uses .select() just to find elements without affecting data.
(selection.prototype as any).select = function(this: any, selector: any): any {
    if(typeof selector === 'string') {
        // Save __data__ on all elements that might be affected
        const savedData: Array<{ node: any; data: any }> = [];
        const groups = this._groups;
        for(let j = 0; j < groups.length; ++j) {
            for(let i = 0; i < groups[j].length; ++i) {
                const node = groups[j][i];
                if(node) {
                    const child = node.querySelector(selector);
                    if(child && '__data__' in child) {
                        savedData.push({ node: child, data: child.__data__ });
                    }
                }
            }
        }
        const result = _origSelect.call(this, selector);
        // Restore original data
        for(let k = 0; k < savedData.length; k++) {
            savedData[k].node.__data__ = savedData[k].data;
        }
        return result;
    }
    return _origSelect.apply(this, arguments);
};

// .style({obj}) polyfill REMOVED — all call sites converted to individual calls.
// .attr({obj}) still needed for ~40 call sites that pass object variables.

const _origAttr = (selection.prototype as any).attr;
(selection.prototype as any).attr = function(this: any, nameOrObj: any, value?: any): any {
    // Object form: .attr({key: val, ...}) — still used by ~40 call sites
    if(typeof nameOrObj === 'object' && nameOrObj !== null && !(nameOrObj instanceof String)) {
        for(const key in nameOrObj) {
            _origAttr.call(this, key, nameOrObj[key]);
        }
        return this;
    }
    // Getter form with no node: return undefined (v3 compat) instead of crashing
    if(arguments.length === 1 && typeof nameOrObj === 'string' && !this.node()) {
        return undefined;
    }
    return _origAttr.apply(this, arguments);
};

// Patch .enter() to auto-merge entered nodes back into the update selection (v3 behavior).
// In d3 v3, after enter().append(), the appended nodes were automatically part of the
// update selection. In v4+, enter and update are separate selections. This polyfill
// wraps .append() and .insert() on enter selections to merge entered nodes back.
(selection.prototype as any).enter = function(this: any): any {
    const enterSel = _origEnter.call(this);
    const updateSel = this;
    const _origAppend = enterSel.append;
    const _origInsert = enterSel.insert;

    enterSel.append = function(this: any): any {
        const result = _origAppend.apply(this, arguments);
        // Merge entered nodes into the update selection's _groups
        const enterGroups = result._groups;
        const updateGroups = updateSel._groups;
        for(let i = 0; i < updateGroups.length; i++) {
            for(let j = 0; j < updateGroups[i].length; j++) {
                if(!updateGroups[i][j] && enterGroups[i] && enterGroups[i][j]) {
                    updateGroups[i][j] = enterGroups[i][j];
                }
            }
        }
        return result;
    };

    enterSel.insert = function(this: any): any {
        const result = _origInsert.apply(this, arguments);
        const enterGroups = result._groups;
        const updateGroups = updateSel._groups;
        for(let i = 0; i < updateGroups.length; i++) {
            for(let j = 0; j < updateGroups[i].length; j++) {
                if(!updateGroups[i][j] && enterGroups[i] && enterGroups[i][j]) {
                    updateGroups[i][j] = enterGroups[i][j];
                }
            }
        }
        return result;
    };

    return enterSel;
};
