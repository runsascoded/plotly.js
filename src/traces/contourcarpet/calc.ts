import colorscaleCalc from '../../components/colorscale/calc.js';
import Lib from '../../lib/index.js';
import convertColumnData from '../heatmap/convert_column_xyz.js';
import clean2dArray from '../heatmap/clean_2d_array.js';
import interp2d from '../heatmap/interp2d.js';
import findEmpties from '../heatmap/find_empties.js';
import makeBoundArray from '../heatmap/make_bound_array.js';
import supplyDefaults from './defaults.js';
import lookupCarpet from '../carpet/lookup_carpetid.js';
import setContours from '../contour/set_contours.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

export default function calc(gd: GraphDiv, trace: FullTrace) {
    var carpet = trace._carpetTrace = lookupCarpet(gd, trace);
    if(!carpet || !carpet.visible || carpet.visible === 'legendonly') return;

    if(!trace.a || !trace.b) {
        // Look up the original incoming carpet data:
        var carpetdata = gd.data[carpet.index];

        // Look up the incoming trace data, *except* perform a shallow
        // copy so that we're not actually modifying it when we use it
        // to supply defaults:
        var tracedata = gd.data[trace.index];
        // var tracedata = extendFlat({}, gd.data[trace.index]);

        // If the data is not specified
        if(!tracedata.a) tracedata.a = carpetdata.a;
        if(!tracedata.b) tracedata.b = carpetdata.b;

        supplyDefaults(tracedata, trace, trace._defaultColor, gd._fullLayout);
    }

    var cd = heatmappishCalc(gd, trace);
    setContours(trace, trace._z);

    return cd;
}

function heatmappishCalc(gd, trace) {
    // prepare the raw data
    // run makeCalcdata on x and y even for heatmaps, in case of category mappings
    var carpet = trace._carpetTrace;
    var aax = carpet.aaxis;
    var bax = carpet.baxis;
    var a,
        a0,
        da,
        b,
        b0,
        db,
        z;

    // cancel minimum tick spacings (only applies to bars and boxes)
    aax._minDtick = 0;
    bax._minDtick = 0;

    if(Lib.isArray1D(trace.z)) convertColumnData(trace, aax, bax, 'a', 'b', ['z']);
    a = trace._a = trace._a || trace.a;
    b = trace._b = trace._b || trace.b;

    a = a ? aax.makeCalcdata(trace, '_a') : [];
    b = b ? bax.makeCalcdata(trace, '_b') : [];
    a0 = trace.a0 || 0;
    da = trace.da || 1;
    b0 = trace.b0 || 0;
    db = trace.db || 1;

    z = trace._z = clean2dArray(trace._z || trace.z, trace.transpose);

    trace._emptypoints = findEmpties(z);
    interp2d(z, trace._emptypoints);

    // create arrays of brick boundaries, to be used by autorange and heatmap.plot
    var xlen = Lib.maxRowLength(z);
    var xIn = trace.xtype === 'scaled' ? '' : a;
    var xArray = makeBoundArray(trace, xIn, a0, da, xlen, aax);
    var yIn = trace.ytype === 'scaled' ? '' : b;
    var yArray = makeBoundArray(trace, yIn, b0, db, z.length, bax);

    var cd0 = {
        a: xArray,
        b: yArray,
        z: z,
    };

    if(trace.contours.type === 'levels' && trace.contours.coloring !== 'none') {
        // auto-z and autocolorscale if applicable
        colorscaleCalc(gd, trace, {
            vals: z,
            containerStr: '',
            cLetter: 'z'
        });
    }

    return [cd0];
}
