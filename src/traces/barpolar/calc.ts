import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import colorscaleCalc from '../../components/colorscale/calc.js';
import _index from '../../lib/index.js';
const { isArrayOrTypedArray, extendFlat } = _index;
import arraysToCalcdata from '../bar/arrays_to_calcdata.js';
import _cross_trace_calc from '../bar/cross_trace_calc.js';
const { setGroupPositions } = _cross_trace_calc;
import calcSelection from '../scatter/calc_selection.js';
import { traceIs } from '../../registry.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

function calc(gd: GraphDiv, trace: FullTrace) {
    const fullLayout = gd._fullLayout;
    const subplotId = trace.subplot;
    const radialAxis = fullLayout[subplotId].radialaxis;
    const angularAxis = fullLayout[subplotId].angularaxis;
    const rArray = radialAxis.makeCalcdata(trace, 'r');
    const thetaArray = angularAxis.makeCalcdata(trace, 'theta');
    const len = trace._length;
    const cd = new Array(len);

    // 'size' axis variables
    const sArray = rArray;
    // 'pos' axis variables
    const pArray = thetaArray;

    for(let i = 0; i < len; i++) {
        cd[i] = {p: pArray[i], s: sArray[i]};
    }

    // convert width and offset in 'c' coordinate,
    // set 'c' value(s) in trace._width and trace._offset,
    // to make Bar.crossTraceCalc "just work"
    function d2c(attr) {
        const val = trace[attr];
        if(val !== undefined) {
            trace['_' + attr] = isArrayOrTypedArray(val) ?
                angularAxis.makeCalcdata(trace, attr) :
                angularAxis.d2c(val, trace.thetaunit);
        }
    }

    if(angularAxis.type === 'linear') {
        d2c('width');
        d2c('offset');
    }

    if(hasColorscale(trace, 'marker')) {
        colorscaleCalc(gd, trace, {
            vals: trace.marker.color,
            containerStr: 'marker',
            cLetter: 'c'
        });
    }
    if(hasColorscale(trace, 'marker.line')) {
        colorscaleCalc(gd, trace, {
            vals: trace.marker.line.color,
            containerStr: 'marker.line',
            cLetter: 'c'
        });
    }

    arraysToCalcdata(cd, trace);
    calcSelection(cd, trace);

    return cd;
}

function crossTraceCalc(gd, polarLayout, subplotId) {
    const calcdata = gd.calcdata;
    const barPolarCd: any[] = [];

    for(let i = 0; i < calcdata.length; i++) {
        const cdi = calcdata[i];
        const trace = cdi[0].trace;

        if(trace.visible === true && traceIs(trace, 'bar') &&
            trace.subplot === subplotId
        ) {
            barPolarCd.push(cdi);
        }
    }

    // to make _extremes is filled in correctly so that
    // polar._subplot.radialAxis can get auotrange'd
    // TODO clean up!
    // I think we want to call getAutorange on polar.radialaxis
    // NOT on polar._subplot.radialAxis
    const rAxis = extendFlat({}, polarLayout.radialaxis, {_id: 'x'});
    const aAxis = polarLayout.angularaxis;

    setGroupPositions(gd, aAxis, rAxis, barPolarCd, {
        mode: polarLayout.barmode,
        norm: polarLayout.barnorm,
        gap: polarLayout.bargap,
        groupgap: polarLayout.bargroupgap
    });
}

export default {
    calc: calc,
    crossTraceCalc: crossTraceCalc
};
