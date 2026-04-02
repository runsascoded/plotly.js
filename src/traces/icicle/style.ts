import type { FullTrace, GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import Lib from '../../lib/index.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;
import fillOne from '../sunburst/fill_one.js';

function style(gd: GraphDiv): void {
    const s = gd._fullLayout._iciclelayer.selectAll('.trace');
    resizeText(gd, s, 'icicle');

    s.each(function(cd) {
        const gTrace = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;

        gTrace.style('opacity', trace.opacity);

        gTrace.selectAll('path.surface').each(function(pt) {
            select(this).call(styleOne, pt, trace, gd);
        });
    });
}

function styleOne(s: any, pt: any, trace: FullTrace, gd: GraphDiv): void {
    const cdi = pt.data.data;
    const isLeaf = !pt.children;
    const ptNumber = cdi.i;
    const lineColor = Lib.castOption(trace, ptNumber, 'marker.line.color') || Color.defaultLine;
    const lineWidth = Lib.castOption(trace, ptNumber, 'marker.line.width') || 0;

    s.call(fillOne, pt, trace, gd)
        .style('stroke-width', lineWidth)
        .call(Color.stroke, lineColor)
        .style('opacity', isLeaf ? trace.leaf.opacity : null);
}

export default {
    style: style,
    styleOne: styleOne
};
