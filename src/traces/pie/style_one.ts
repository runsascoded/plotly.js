import type { FullTrace, GraphDiv } from '../../../types/core';
import Color from '../../components/color/index.js';
import { castOption } from './helpers.js';
import fillOne from './fill_one.js';

export default function styleOne(s: any, pt: any, trace: FullTrace, gd: GraphDiv): void {
    var line = trace.marker.line;
    var lineColor = castOption(line.color, pt.pts) || Color.defaultLine;
    var lineWidth = castOption(line.width, pt.pts) || 0;

    s.call(fillOne, pt, trace, gd)
        .style('stroke-width', lineWidth)
        .call(Color.stroke, lineColor);
}
