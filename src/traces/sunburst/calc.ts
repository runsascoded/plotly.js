import type { FullTrace, GraphDiv } from '../../../types/core';
import * as d3Hierarchy from 'd3-hierarchy';
import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import _index from '../../components/colorscale/index.js';
const { makeColorScaleFuncFromTrace: makeColorScaleFn, calc: colorscaleCalc } = _index;
import _calc from '../pie/calc.js';
const { makePullColorFn, generateExtendedColors } = _calc;
import _numerical from '../../constants/numerical.js';
const { ALMOST_EQUAL } = _numerical;

const sunburstExtendedColorWays = {};
const treemapExtendedColorWays = {};
const icicleExtendedColorWays = {};

export const calc = function(gd: GraphDiv, trace: FullTrace) {
    const fullLayout = gd._fullLayout;
    const ids = trace.ids;
    const hasIds = Lib.isArrayOrTypedArray(ids);
    const labels = trace.labels;
    const parents = trace.parents;
    const values = trace.values;
    const hasValues = Lib.isArrayOrTypedArray(values);
    const cd: any[] = [];

    const parent2children: any = {};
    const refs: any = {};
    const addToLookup = function(parent: any, v: any) {
        if(parent2children[parent]) parent2children[parent].push(v);
        else parent2children[parent] = [v];
        refs[v] = 1;
    };

    // treat number `0` as valid
    const isValidKey = function(k: any) {
        return k || typeof k === 'number';
    };

    const isValidVal = function(i: any) {
        return !hasValues || (isNumeric(values[i]) && values[i] >= 0);
    };

    let len;
    let isValid;
    let getId;

    if(hasIds) {
        len = Math.min(ids.length, parents.length);
        isValid = function(i: any) { return isValidKey(ids[i]) && isValidVal(i); };
        getId = function(i: any) { return String(ids[i]); };
    } else {
        len = Math.min(labels.length, parents.length);
        isValid = function(i: any) { return isValidKey(labels[i]) && isValidVal(i); };
        // TODO We could allow some label / parent duplication
        //
        // From AJ:
        //  It would work OK for one level
        //  (multiple rows with the same name and different parents -
        //  or even the same parent) but if that name is then used as a parent
        //  which one is it?
        getId = function(i: any) { return String(labels[i]); };
    }

    if(hasValues) len = Math.min(len, values.length);

    for(let i = 0; i < len; i++) {
        if(isValid(i)) {
            const id = getId(i);
            const pid = isValidKey(parents[i]) ? String(parents[i]) : '';

            const cdi: Record<string, any> = {
                i: i,
                id: id,
                pid: pid,
                label: isValidKey(labels[i]) ? String(labels[i]) : ''
            };

            if(hasValues) cdi.v = +values[i];
            cd.push(cdi);
            addToLookup(pid, id);
        }
    }

    if(!parent2children['']) {
        const impliedRoots: any[] = [];
        let k;
        for(k in parent2children) {
            if(!refs[k]) {
                impliedRoots.push(k);
            }
        }

        // if an `id` has no ref in the `parents` array,
        // take it as being the root node

        if(impliedRoots.length === 1) {
            k = impliedRoots[0];
            cd.unshift({
                hasImpliedRoot: true,
                id: k,
                pid: '',
                label: k
            });
        } else {
            return Lib.warn([
                'Multiple implied roots, cannot build', trace.type, 'hierarchy of', trace.name + '.',
                'These roots include:', impliedRoots.join(', ')
            ].join(' '));
        }
    } else if(parent2children[''].length > 1) {
        const dummyId = Lib.randstr();

        // if multiple rows linked to the root node,
        // add dummy "root of roots" node to make d3 build the hierarchy successfully

        for(let j = 0; j < cd.length; j++) {
            if((cd[j] as any).pid === '') {
                (cd[j] as any).pid = dummyId;
            }
        }

        cd.unshift({
            hasMultipleRoots: true,
            id: dummyId,
            pid: '',
            label: ''
        });
    }

    // TODO might be better to replace stratify() with our own algorithm
    let root;
    try {
        root = d3Hierarchy.stratify()
            .id(function(d: any) { return d.id; })
            .parentId(function(d: any) { return d.pid; })(cd);
    } catch(e) {
        return Lib.warn([
            'Failed to build', trace.type, 'hierarchy of', trace.name + '.',
            'Error:', (e as any).message
        ].join(' '));
    }

    const hierarchy = d3Hierarchy.hierarchy(root);
    let failed = false;

    if(hasValues) {
        switch(trace.branchvalues) {
            case 'remainder':
                hierarchy.sum(function(d: any) { return d.data.v; });
                break;
            case 'total':
                hierarchy.each(function(d: any) {
                    const cdi = d.data.data;
                    let v = cdi.v;

                    if(d.children) {
                        const partialSum = d.children.reduce(function(a: any, c: any) {
                            return a + c.data.data.v;
                        }, 0);

                        // N.B. we must fill in `value` for generated sectors
                        // with the partialSum to compute the correct partition
                        if(cdi.hasImpliedRoot || cdi.hasMultipleRoots) {
                            v = partialSum;
                        }

                        if(v < partialSum * ALMOST_EQUAL) {
                            failed = true;
                            return Lib.warn([
                                'Total value for node', d.data.data.id, 'of', trace.name,
                                'is smaller than the sum of its children.',
                                '\nparent value =', v,
                                '\nchildren sum =', partialSum
                            ].join(' '));
                        }
                    }

                    d.value = v;
                });
                break;
        }
    } else {
        countDescendants(hierarchy, trace, {
            branches: trace.count.indexOf('branches') !== -1,
            leaves: trace.count.indexOf('leaves') !== -1
        });
    }

    if(failed) return;

    // TODO add way to sort by height also?
    if(trace.sort) {
        hierarchy.sort(function(a: any, b: any) { return b.value - a.value; });
    }

    let pullColor: any;
    let scaleColor: any;
    let colors = trace.marker.colors || [];
    const hasColors = !!colors.length;

    if(trace._hasColorscale) {
        if(!hasColors) {
            colors = hasValues ? trace.values : trace._values;
        }

        colorscaleCalc(gd, trace, {
            vals: colors,
            containerStr: 'marker',
            cLetter: 'c'
        });

        scaleColor = makeColorScaleFn(trace.marker);
    } else {
        pullColor = makePullColorFn(fullLayout['_' + trace.type + 'colormap']);
    }

    // TODO keep track of 'root-children' (i.e. branch) for hover info etc.

    hierarchy.each(function(d: any) {
        const cdi = d.data.data;
        // N.B. this mutates items in `cd`
        cdi.color = trace._hasColorscale ?
            scaleColor(colors[cdi.i]) :
            pullColor(colors[cdi.i], cdi.id);
    });

    (cd[0] as any).hierarchy = hierarchy;

    return cd;
};

export const _runCrossTraceCalc = function(desiredType: string, gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const calcdata = gd.calcdata;
    let colorWay = fullLayout[desiredType + 'colorway'];
    const colorMap = fullLayout['_' + desiredType + 'colormap'];

    if(fullLayout['extend' + desiredType + 'colors']) {
        colorWay = generateExtendedColors(colorWay,
            desiredType === 'icicle' ? icicleExtendedColorWays :
            desiredType === 'treemap' ? treemapExtendedColorWays :
                sunburstExtendedColorWays
        );
    }
    let dfltColorCount = 0;

    let rootColor: any;
    function pickColor(d: any) {
        const cdi = d.data.data;
        const id = cdi.id;

        if(cdi.color === false) {
            if(colorMap[id]) {
                // have we seen this label and assigned a color to it in a previous trace?
                cdi.color = colorMap[id];
            } else if(d.parent) {
                if(d.parent.parent) {
                    // from third-level on, inherit from parent
                    cdi.color = d.parent.data.data.color;
                } else {
                    // pick new color for second level
                    colorMap[id] = cdi.color = colorWay[dfltColorCount % colorWay.length];
                    dfltColorCount++;
                }
            } else {
                // set root color. no coloring by default.
                cdi.color = rootColor;
            }
        }
    }

    for(let i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        const cd0 = cd[0];
        if(cd0.trace.type === desiredType && cd0.hierarchy) {
            rootColor = cd0.trace.root.color;
            cd0.hierarchy.each(pickColor);
        }
    }
};

export const crossTraceCalc = function(gd: GraphDiv) {
    return _runCrossTraceCalc('sunburst', gd);
};

function countDescendants(node: any, trace: FullTrace, opts: { branches: boolean; leaves: boolean }) {
    let nChild = 0;

    const children = node.children;
    if(children) {
        const len = children.length;

        for(let i = 0; i < len; i++) {
            nChild += countDescendants(children[i], trace, opts);
        }

        if(opts.branches) nChild++; // count this branch
    } else {
        if(opts.leaves) nChild++; // count this leaf
    }

    // save to the node
    node.value = node.data.data.value = nChild;

    // save to the trace
    if(!trace._values) trace._values = [];
    trace._values[node.data.data.i] = nChild;

    return nChild;
}

export default { calc, _runCrossTraceCalc, crossTraceCalc };
