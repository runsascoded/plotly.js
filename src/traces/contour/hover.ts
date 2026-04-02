import Color from '../../components/color/index.js';
import heatmapHoverPoints from '../heatmap/hover.js';

export default function hoverPoints(pointData: any,  xval: any,  yval: any,  hovermode: any,  opts: any) {
    if(!opts) opts = {};
    opts.isContour = true;

    const hoverData = heatmapHoverPoints(pointData, xval, yval, hovermode, opts);

    if(hoverData) {
        hoverData.forEach(function(hoverPt) {
            const trace = hoverPt.trace;
            if(trace.contours.type === 'constraint') {
                if(trace.fillcolor && Color.opacity(trace.fillcolor)) {
                    hoverPt.color = Color.addOpacity(trace.fillcolor, 1);
                } else if(trace.contours.showlines && Color.opacity(trace.line.color)) {
                    hoverPt.color = Color.addOpacity(trace.line.color, 1);
                }
            }
        });
    }

    return hoverData;
}
