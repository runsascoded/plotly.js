import Colorscale from '../../components/colorscale/index.js';
import heatmapCalc from '../heatmap/calc.js';
import setContours from './set_contours.js';
import endPlus from './end_plus.js';
export default function calc(gd, trace) {
    const cd = heatmapCalc(gd, trace);
    const zOut = cd[0].z;
    setContours(trace, zOut);
    const contours = trace.contours;
    const cOpts = Colorscale.extractOpts(trace);
    let cVals;
    if (contours.coloring === 'heatmap' && cOpts.auto && trace.autocontour === false) {
        const start = contours.start;
        const end = endPlus(contours);
        let cs = contours.size || 1;
        let nc = Math.floor((end - start) / cs) + 1;
        if (!isFinite(cs)) {
            cs = 1;
            nc = 1;
        }
        const min0 = start - cs / 2;
        const max0 = min0 + nc * cs;
        cVals = [min0, max0];
    }
    else {
        cVals = zOut;
    }
    Colorscale.calc(gd, trace, { vals: cVals, cLetter: 'z' });
    return cd;
}
