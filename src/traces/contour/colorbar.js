import Colorscale from '../../components/colorscale/index.js';
import makeColorMap from './make_color_map.js';
import endPlus from './end_plus.js';
function calc(gd, trace, opts) {
    const contours = trace.contours;
    const line = trace.line;
    const cs = contours.size || 1;
    const coloring = contours.coloring;
    const colorMap = makeColorMap(trace, { isColorbar: true });
    if (coloring === 'heatmap') {
        const cOpts = Colorscale.extractOpts(trace);
        opts._fillgradient = cOpts.reversescale ?
            Colorscale.flipScale(cOpts.colorscale) :
            cOpts.colorscale;
        opts._zrange = [cOpts.min, cOpts.max];
    }
    else if (coloring === 'fill') {
        opts._fillcolor = colorMap;
    }
    opts._line = {
        color: coloring === 'lines' ? colorMap : line.color,
        width: contours.showlines !== false ? line.width : 0,
        dash: line.dash
    };
    opts._levels = {
        start: contours.start,
        end: endPlus(contours),
        size: cs
    };
}
export default {
    min: 'zmin',
    max: 'zmax',
    calc: calc
};
