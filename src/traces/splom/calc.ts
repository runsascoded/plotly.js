import type { FullAxis, FullTrace, GraphDiv } from '../../../types/core';
import Lib from '../../lib/index.js';
import AxisIDs from '../../plots/cartesian/axis_ids.js';
import _calc from '../scatter/calc.js';
const { calcMarkerSize, calcAxisExpansion } = _calc;
import calcColorscale from '../scatter/colorscale_calc.js';
import _convert from '../scattergl/convert.js';
const { markerSelection: convertMarkerSelection, markerStyle: convertMarkerStyle } = _convert;
import sceneUpdate from './scene_update.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import _constants from '../scattergl/constants.js';
const { TOO_MANY_POINTS } = _constants;

export default function calc(gd: GraphDiv, trace: FullTrace) {
    const dimensions = trace.dimensions;
    const commonLength = trace._length;
    const opts: any = {};
    // 'c' for calculated, 'l' for linear,
    // only differ here for log axes, pass ldata to createMatrix as 'data'
    const cdata = opts.cdata = [];
    const ldata = opts.data = [];
    // keep track of visible dimensions
    const visibleDims = trace._visibleDims = [];
    let i, k, dim, xa, ya;

    function makeCalcdata(ax: FullAxis, dim) {
        // call makeCalcdata with fake input
        const ccol = ax.makeCalcdata({
            v: dim.values,
            vcalendar: trace.calendar
        }, 'v');

        for(let j = 0; j < ccol.length; j++) {
            ccol[j] = ccol[j] === BADNUM ? NaN : ccol[j];
        }
        cdata.push(ccol);
        ldata.push(ax.type === 'log' ? Lib.simpleMap(ccol, ax.c2l) : ccol);
    }

    for(i = 0; i < dimensions.length; i++) {
        dim = dimensions[i];

        if(dim.visible) {
            xa = AxisIDs.getFromId(gd, trace._diag[i][0]);
            ya = AxisIDs.getFromId(gd, trace._diag[i][1]);

            // if corresponding x & y axes don't have matching types, skip dim
            if(xa && ya && xa.type !== ya.type) {
                Lib.log('Skipping splom dimension ' + i + ' with conflicting axis types');
                continue;
            }

            if(xa) {
                makeCalcdata(xa, dim);
                if(ya && ya.type === 'category') {
                    ya._categories = xa._categories.slice();
                }
            } else {
                // should not make it here, if both xa and ya undefined
                makeCalcdata(ya, dim);
            }

            visibleDims.push(i);
        }
    }

    calcColorscale(gd, trace);
    Lib.extendFlat(opts, convertMarkerStyle(gd, trace));

    const visibleLength = cdata.length;
    const hasTooManyPoints = (visibleLength * commonLength) > TOO_MANY_POINTS;

    // Reuse SVG scatter axis expansion routine.
    // For graphs with very large number of points and array marker.size,
    // use average marker size instead to speed things up.
    let ppad;
    if(hasTooManyPoints) {
        ppad = opts.sizeAvg || Math.max(opts.size, 3);
    } else {
        ppad = calcMarkerSize(trace, commonLength);
    }

    for(k = 0; k < visibleDims.length; k++) {
        i = visibleDims[k];
        dim = dimensions[i];
        xa = AxisIDs.getFromId(gd, trace._diag[i][0]) || {};
        ya = AxisIDs.getFromId(gd, trace._diag[i][1]) || {};
        calcAxisExpansion(gd, trace, xa, ya, cdata[k], cdata[k], ppad);
    }

    const scene = sceneUpdate(gd, trace);
    if(!scene.matrix) scene.matrix = true;
    scene.matrixOptions = opts;

    scene.selectedOptions = convertMarkerSelection(gd, trace, trace.selected);
    scene.unselectedOptions = convertMarkerSelection(gd, trace, trace.unselected);

    return [{x: false, y: false, t: {}, trace: trace}];
}
