import d3 from '@plotly/d3';
import Color from '../../components/color/index.js';
import Lib from '../../lib/index.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;
import fillOne from '../sunburst/fill_one.js';

function style(gd) {
    var s = gd._fullLayout._iciclelayer.selectAll('.trace');
    resizeText(gd, s, 'icicle');

    s.each(function(cd) {
        var gTrace = d3.select(this);
        var cd0 = cd[0];
        var trace = cd0.trace;

        gTrace.style('opacity', trace.opacity);

        gTrace.selectAll('path.surface').each(function(pt) {
            d3.select(this).call(styleOne, pt, trace, gd);
        });
    });
}

function styleOne(s, pt, trace, gd) {
    var cdi = pt.data.data;
    var isLeaf = !pt.children;
    var ptNumber = cdi.i;
    var lineColor = Lib.castOption(trace, ptNumber, 'marker.line.color') || Color.defaultLine;
    var lineWidth = Lib.castOption(trace, ptNumber, 'marker.line.width') || 0;

    s.call(fillOne, pt, trace, gd)
        .style('stroke-width', lineWidth)
        .call(Color.stroke, lineColor)
        .style('opacity', isLeaf ? trace.leaf.opacity : null);
}

export default {
    style: style,
    styleOne: styleOne
};
