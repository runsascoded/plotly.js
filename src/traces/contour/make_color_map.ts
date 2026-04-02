import { extent } from 'd3-array';
import Colorscale from '../../components/colorscale/index.js';
import endPlus from './end_plus.js';

export default function makeColorMap(trace: any) {
    const contours = trace.contours;
    let start = contours.start;
    let end = endPlus(contours);
    let cs = contours.size || 1;
    let nc = Math.floor((end - start) / cs) + 1;
    let extra = contours.coloring === 'lines' ? 0 : 1;
    const cOpts = Colorscale.extractOpts(trace);

    if(!isFinite(cs)) {
        cs = 1;
        nc = 1;
    }

    const scl = cOpts.reversescale ?
        Colorscale.flipScale(cOpts.colorscale) :
        cOpts.colorscale;

    const len = scl.length;
    const domain = new Array(len);
    const range = new Array(len);

    let si, i;

    const zmin0 = cOpts.min;
    const zmax0 = cOpts.max;

    if(contours.coloring === 'heatmap') {
        for(i = 0; i < len; i++) {
            si = scl[i];
            domain[i] = si[0] * (zmax0 - zmin0) + zmin0;
            range[i] = si[1];
        }

        // do the contours extend beyond the colorscale?
        // if so, extend the colorscale with constants
        const zRange = extent([
            zmin0,
            zmax0,
            contours.start,
            contours.start + cs * (nc - 1)
        ]);
        const zmin = zRange[zmin0 < zmax0 ? 0 : 1];
        const zmax = zRange[zmin0 < zmax0 ? 1 : 0];

        if(zmin !== zmin0) {
            domain.splice(0, 0, zmin);
            range.splice(0, 0, range[0]);
        }

        if(zmax !== zmax0) {
            domain.push(zmax);
            range.push(range[range.length - 1]);
        }
    } else {
        const zRangeInput = trace._input && (
            typeof trace._input.zmin === 'number' && typeof trace._input.zmax === 'number'
        );

        // If zmin/zmax are explicitly set, consider case where user specifies a
        // narrower z range than that of the contours start/end.
        if(zRangeInput && (start <= zmin0 || end >= zmax0)) {
            if(start <= zmin0) start = zmin0;
            if(end >= zmax0) end = zmax0;
            nc = Math.floor((end - start) / cs) + 1;
            extra = 0;
        }

        for(i = 0; i < len; i++) {
            si = scl[i];
            domain[i] = (si[0] * (nc + extra - 1) - (extra / 2)) * cs + start;
            range[i] = si[1];
        }

        // Make the colorscale fit the z range except if contours are explicitly
        // set BUT NOT zmin/zmax.
        if(zRangeInput || trace.autocontour) {
            if(domain[0] > zmin0) {
                domain.unshift(zmin0);
                range.unshift(range[0]);
            }
            if(domain[domain.length - 1] < zmax0) {
                domain.push(zmax0);
                range.push(range[range.length - 1]);
            }
        }
    }

    return Colorscale.makeColorScaleFunc(
        {domain: domain, range: range},
        {noNumericCheck: true}
    );
}
