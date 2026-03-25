import Drawing from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';

export default function fillOne(s, pt, trace, gd) {
    var pattern = trace.marker.pattern;
    if(pattern && pattern.shape) {
        Drawing.pointStyle(s, trace, gd, pt);
    } else {
        Color.fill(s, pt.color);
    }
}
