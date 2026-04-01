import type { FullTrace, GraphDiv } from '../../../types/core';
import Colorscale from '../../components/colorscale/index.js';
import heatmapCalc from '../heatmap/calc.js';
import setContours from './set_contours.js';
import endPlus from './end_plus.js';

export default function calc(gd: GraphDiv,  trace: FullTrace) {
    var cd = heatmapCalc(gd, trace);

    var zOut = cd[0].z;
    setContours(trace, zOut);

    var contours = trace.contours;
    var cOpts = Colorscale.extractOpts(trace);
    var cVals;

    if(contours.coloring === 'heatmap' && cOpts.auto && trace.autocontour === false) {
        var start = contours.start;
        var end = endPlus(contours);
        var cs = contours.size || 1;
        var nc = Math.floor((end - start) / cs) + 1;

        if(!isFinite(cs)) {
            cs = 1;
            nc = 1;
        }

        var min0 = start - cs / 2;
        var max0 = min0 + nc * cs;
        cVals = [min0, max0];
    } else {
        cVals = zOut;
    }

    Colorscale.calc(gd, trace, {vals: cVals, cLetter: 'z'});

    return cd;
}
