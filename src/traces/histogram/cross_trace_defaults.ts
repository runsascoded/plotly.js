import type { FullLayout, FullTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import axisIds from '../../plots/cartesian/axis_ids.js';
import { traceIs } from '../../registry.js';
import handleGroupingDefaults from '../scatter/grouping_defaults.js';
import _defaults from '../bar/defaults.js';
const { validateCornerradius } = _defaults;
import { getAxisGroup } from '../../plots/cartesian/constraints.js';

const nestedProperty = Lib.nestedProperty;

const BINATTRS = [
    {aStr: {x: 'xbins.start', y: 'ybins.start'}, name: 'start'},
    {aStr: {x: 'xbins.end', y: 'ybins.end'}, name: 'end'},
    {aStr: {x: 'xbins.size', y: 'ybins.size'}, name: 'size'},
    {aStr: {x: 'nbinsx', y: 'nbinsy'}, name: 'nbins'}
];

const BINDIRECTIONS = ['x', 'y'];

export default function crossTraceDefaults(fullData: FullTrace[], fullLayout: FullLayout): void {
    const allBinOpts = fullLayout._histogramBinOpts = {};
    const histTraces: any[] = [];
    const mustMatchTracesLookup: any = {};
    const otherTracesList: any[] = [];

    let traceOut: any, traces, groupName, binDir;
    let i, j, k;

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceOut._input, traceOut, traceOut._module.attributes, attr, dflt);
    }

    function orientation2binDir(traceOut: any) {
        return traceOut.orientation === 'v' ? 'x' : 'y';
    }

    function getAxisType(traceOut: any, binDir: any) {
        const ax = axisIds.getFromTrace({_fullLayout: fullLayout}, traceOut, binDir);
        return ax.type;
    }

    function fillBinOpts(traceOut: any, groupName: any, binDir: any) {
        // N.B. group traces that don't have a bingroup with themselves
        const fallbackGroupName = traceOut.uid + '__' + binDir;
        if(!groupName) groupName = fallbackGroupName;

        const axType = getAxisType(traceOut, binDir);
        const calendar = traceOut[binDir + 'calendar'] || '';
        const binOpts = (allBinOpts as any)[groupName];
        let needsNewItem = true;

        if(binOpts) {
            if(axType === binOpts.axType && calendar === binOpts.calendar) {
                needsNewItem = false;
                binOpts.traces.push(traceOut);
                binOpts.dirs.push(binDir);
            } else {
                groupName = fallbackGroupName;

                if(axType !== binOpts.axType) {
                    Lib.warn([
                        'Attempted to group the bins of trace', traceOut.index,
                        'set on a', 'type:' + axType, 'axis',
                        'with bins on', 'type:' + binOpts.axType, 'axis.'
                    ].join(' '));
                }
                if(calendar !== binOpts.calendar) {
                    // prohibit bingroup for traces using different calendar,
                    // there's probably a way to make this work, but skip for now
                    Lib.warn([
                        'Attempted to group the bins of trace', traceOut.index,
                        'set with a', calendar, 'calendar',
                        'with bins',
                        (binOpts.calendar ? 'on a ' + binOpts.calendar + ' calendar' : 'w/o a set calendar')
                    ].join(' '));
                }
            }
        }

        if(needsNewItem) {
            (allBinOpts as any)[groupName] = {
                traces: [traceOut],
                dirs: [binDir],
                axType: axType,
                calendar: traceOut[binDir + 'calendar'] || ''
            };
        }
        traceOut['_' + binDir + 'bingroup'] = groupName;
    }

    for(i = 0; i < fullData.length; i++) {
        traceOut = fullData[i];

        if(traceIs(traceOut, 'histogram')) {
            histTraces.push(traceOut);

            // TODO: this shouldn't be relinked as it's only used within calc
            // https://github.com/plotly/plotly.js/issues/749
            delete traceOut._xautoBinFinished;
            delete traceOut._yautoBinFinished;

            if(traceOut.type === 'histogram') {
                const r = coerce('marker.cornerradius', fullLayout.barcornerradius);
                if(traceOut.marker) {
                    traceOut.marker.cornerradius = validateCornerradius(r);
                }
            }

            // N.B. need to coerce *alignmentgroup* before *bingroup*, as traces
            // in same alignmentgroup "have to match"
            if(!traceIs(traceOut, '2dMap')) {
                handleGroupingDefaults(traceOut._input, traceOut, fullLayout, coerce, fullLayout.barmode);
            }
        }
    }

    const alignmentOpts = fullLayout._alignmentOpts || {};

    // Look for traces that "have to match", that is:
    // - 1d histogram traces on the same subplot with same orientation under barmode:stack,
    // - 1d histogram traces on the same subplot with same orientation under barmode:group
    // - 1d histogram traces on the same position axis with the same orientation
    //   and the same *alignmentgroup* (coerced under barmode:group)
    // - Once `stackgroup` gets implemented (see https://github.com/plotly/plotly.js/issues/3614),
    //   traces within the same stackgroup will also "have to match"
    for(i = 0; i < histTraces.length; i++) {
        traceOut = histTraces[i];
        groupName = '';

        if(!traceIs(traceOut, '2dMap')) {
            binDir = orientation2binDir(traceOut);

            if(fullLayout.barmode === 'group' && traceOut.alignmentgroup) {
                const pa = traceOut[binDir + 'axis'];
                const aGroupId = getAxisGroup(fullLayout, pa) + traceOut.orientation;
                if((alignmentOpts[aGroupId] || {})[traceOut.alignmentgroup]) {
                    groupName = aGroupId;
                }
            }

            if(!groupName && fullLayout.barmode !== 'overlay') {
                groupName = (
                    getAxisGroup(fullLayout, traceOut.xaxis) +
                    getAxisGroup(fullLayout, traceOut.yaxis) +
                    orientation2binDir(traceOut)
                );
            }
        }

        if(groupName) {
            if(!mustMatchTracesLookup[groupName]) {
                mustMatchTracesLookup[groupName] = [];
            }
            mustMatchTracesLookup[groupName].push(traceOut);
        } else {
            otherTracesList.push(traceOut);
        }
    }

    // Setup binOpts for traces that have to match,
    // if the traces have a valid bingroup, use that
    // if not use axis+binDir groupName
    for(groupName in mustMatchTracesLookup) {
        traces = mustMatchTracesLookup[groupName];

        // no need to 'force' anything when a single
        // trace is detected as "must match"
        if(traces.length === 1) {
            otherTracesList.push(traces[0]);
            continue;
        }

        let binGroupFound = false;
        if(traces.length) {
            traceOut = traces[0];
            binGroupFound = coerce('bingroup');
        }

        groupName = binGroupFound || groupName;

        for(i = 0; i < traces.length; i++) {
            traceOut = traces[i];
            const bingroupIn = traceOut._input.bingroup;
            if(bingroupIn && bingroupIn !== groupName) {
                Lib.warn([
                    'Trace', traceOut.index, 'must match',
                    'within bingroup', groupName + '.',
                    'Ignoring its bingroup:', bingroupIn, 'setting.'
                ].join(' '));
            }
            traceOut.bingroup = groupName;

            // N.B. no need to worry about 2dMap case
            // (where both bin direction are set in each trace)
            // as 2dMap trace never "have to match"
            fillBinOpts(traceOut, groupName, orientation2binDir(traceOut));
        }
    }

    // setup binOpts for traces that can but don't have to match,
    // notice that these traces can be matched with traces that have to match
    for(i = 0; i < otherTracesList.length; i++) {
        traceOut = otherTracesList[i];

        const binGroup = coerce('bingroup');

        if(traceIs(traceOut, '2dMap')) {
            for(k = 0; k < 2; k++) {
                binDir = BINDIRECTIONS[k];
                const binGroupInDir = coerce(binDir + 'bingroup',
                    binGroup ? binGroup + '__' + binDir : null
                );
                fillBinOpts(traceOut, binGroupInDir, binDir);
            }
        } else {
            fillBinOpts(traceOut, binGroup, orientation2binDir(traceOut));
        }
    }

    // coerce bin attrs!
    for(groupName in allBinOpts) {
        const binOpts = (allBinOpts as any)[groupName];
        traces = binOpts.traces;

        for(j = 0; j < BINATTRS.length; j++) {
            const attrSpec = BINATTRS[j];
            const attr = attrSpec.name;
            let aStr;
            let autoVals;

            // nbins(x|y) is moot if we have a size. This depends on
            // nbins coming after size in binAttrs.
            if(attr === 'nbins' && binOpts.sizeFound) continue;

            for(i = 0; i < traces.length; i++) {
                traceOut = traces[i];
                binDir = binOpts.dirs[i];
                aStr = (attrSpec.aStr as any)[binDir];

                if(nestedProperty(traceOut._input, aStr).get() !== undefined) {
                    binOpts[attr] = coerce(aStr);
                    binOpts[attr + 'Found'] = true;
                    break;
                }

                autoVals = (traceOut._autoBin || {})[binDir] || {};
                if(autoVals[attr]) {
                    // if this is the *first* autoval
                    nestedProperty(traceOut, aStr).set(autoVals[attr]);
                }
            }

            // start and end we need to coerce anyway, after having collected the
            // first of each into binOpts, in case a trace wants to restrict its
            // data to a certain range
            if(attr === 'start' || attr === 'end') {
                for(; i < traces.length; i++) {
                    traceOut = traces[i];
                    if(traceOut['_' + binDir + 'bingroup']) {
                        autoVals = (traceOut._autoBin || {})[binDir] || {};
                        coerce(aStr, autoVals[attr]);
                    }
                }
            }

            if(attr === 'nbins' && !binOpts.sizeFound && !binOpts.nbinsFound) {
                traceOut = traces[0];
                binOpts[attr] = coerce(aStr);
            }
        }
    }
}
