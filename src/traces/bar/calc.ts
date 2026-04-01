import type { FullTrace, GraphDiv } from '../../../types/core';
import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import colorscaleCalc from '../../components/colorscale/calc.js';
import arraysToCalcdata from './arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';

export default function calc(gd: GraphDiv, trace: FullTrace): any[] {
    var xa = Axes.getFromId(gd, trace.xaxis || 'x');
    var ya = Axes.getFromId(gd, trace.yaxis || 'y');
    var size, pos, origPos, pObj, hasPeriod, pLetter;

    var sizeOpts = {
        msUTC: !!(trace.base || trace.base === 0)
    };

    if(trace.orientation === 'h') {
        size = xa.makeCalcdata(trace, 'x', sizeOpts);
        origPos = ya.makeCalcdata(trace, 'y');
        pObj = alignPeriod(trace, ya, 'y', origPos);
        hasPeriod = !!trace.yperiodalignment;
        pLetter = 'y';
    } else {
        size = ya.makeCalcdata(trace, 'y', sizeOpts);
        origPos = xa.makeCalcdata(trace, 'x');
        pObj = alignPeriod(trace, xa, 'x', origPos);
        hasPeriod = !!trace.xperiodalignment;
        pLetter = 'x';
    }
    pos = pObj.vals;

    // create the "calculated data" to plot
    var serieslen = Math.min(pos.length, size.length);
    var cd = new Array(serieslen);

    // set position and size
    for(var i = 0; i < serieslen; i++) {
        cd[i] = { p: pos[i], s: size[i] };

        if(hasPeriod) {
            cd[i].orig_p = origPos[i]; // used by hover
            cd[i][pLetter + 'End'] = pObj.ends[i];
            cd[i][pLetter + 'Start'] = pObj.starts[i];
        }

        if(trace.ids) {
            cd[i].id = String(trace.ids[i]);
        }
    }

    // auto-z and autocolorscale if applicable
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
