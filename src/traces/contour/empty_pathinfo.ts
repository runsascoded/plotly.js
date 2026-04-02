import type { PlotInfo } from '../../../types/core';
import Lib from '../../lib/index.js';
import constraintMapping from './constraint_mapping.js';
import endPlus from './end_plus.js';

export default function emptyPathinfo(contours,  plotinfo: PlotInfo,  cd0) {
    const contoursFinal = (contours.type === 'constraint') ?
        constraintMapping[contours._operation](contours.value) :
        contours;

    const cs = contoursFinal.size;
    const pathinfo = [];
    const end = endPlus(contoursFinal);

    const carpet = cd0.trace._carpetTrace;

    const basePathinfo = carpet ? {
        // store axes so we can convert to px
        xaxis: carpet.aaxis,
        yaxis: carpet.baxis,
        // full data arrays to use for interpolation
        x: cd0.a,
        y: cd0.b
    } : {
        xaxis: plotinfo.xaxis,
        yaxis: plotinfo.yaxis,
        x: cd0.x,
        y: cd0.y
    };

    for(let ci = contoursFinal.start; ci < end; ci += cs) {
        pathinfo.push(Lib.extendFlat({
            level: ci,
            // all the cells with nontrivial marching index
            crossings: {},
            // starting points on the edges of the lattice for each contour
            starts: [],
            // all unclosed paths (may have less items than starts,
            // if a path is closed by rounding)
            edgepaths: [],
            // all closed paths
            paths: [],
            z: cd0.z,
            smoothing: cd0.trace.line.smoothing
        }, basePathinfo));

        if(pathinfo.length > 1000) {
            Lib.warn('Too many contours, clipping at 1000', contours);
            break;
        }
    }
    return pathinfo;
}
