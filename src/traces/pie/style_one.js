import Color from '../../components/color/index.js';
import { castOption } from './helpers.js';
import fillOne from './fill_one.js';
export default function styleOne(s, pt, trace, gd) {
    const line = trace.marker.line;
    const lineColor = castOption(line.color, pt.pts) || Color.defaultLine;
    const lineWidth = castOption(line.width, pt.pts) || 0;
    s.call(fillOne, pt, trace, gd)
        .style('stroke-width', lineWidth)
        .call(Color.stroke, lineColor);
}
