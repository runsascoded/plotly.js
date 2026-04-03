import { select } from 'd3-selection';
import { fillGroupStyle, lineGroupStyle, pointStyle, selectedPointStyle, selectedTextStyle, textPointStyle } from '../../components/drawing/index.js';
import { getComponentMethod } from '../../registry.js';
function style(gd) {
    const s = select(gd).selectAll('g.trace.scatter');
    s.style('opacity', function (d) {
        return d[0].trace.opacity;
    });
    s.selectAll('g.points').each(function (d) {
        const sel = select(this);
        const trace = d.trace || d[0].trace;
        stylePoints(sel, trace, gd);
    });
    s.selectAll('g.text').each(function (d) {
        const sel = select(this);
        const trace = d.trace || d[0].trace;
        styleText(sel, trace, gd);
    });
    s.selectAll('g.trace path.js-line')
        .call(lineGroupStyle);
    s.selectAll('g.trace path.js-fill')
        .call(fillGroupStyle, gd, false);
    getComponentMethod('errorbars', 'style')(s);
}
function stylePoints(sel, trace, gd) {
    pointStyle(sel.selectAll('path.point'), trace, gd);
}
function styleText(sel, trace, gd) {
    textPointStyle(sel.selectAll('text'), trace, gd);
}
function styleOnSelect(gd, cd, sel) {
    const trace = cd[0].trace;
    if (trace.selectedpoints) {
        selectedPointStyle(sel.selectAll('path.point'), trace);
        selectedTextStyle(sel.selectAll('text'), trace);
    }
    else {
        stylePoints(sel, trace, gd);
        styleText(sel, trace, gd);
    }
}
export default {
    style: style,
    stylePoints: stylePoints,
    styleText: styleText,
    styleOnSelect: styleOnSelect
};
