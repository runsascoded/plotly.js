import type { CalcDatum, FullTrace, GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { fillGroupStyle, lineGroupStyle, pointStyle, selectedPointStyle, selectedTextStyle, textPointStyle } from '../../components/drawing/index.js';
import Registry from '../../registry.js';

function style(gd: GraphDiv): void {
    const s = select(gd).selectAll('g.trace.scatter');

    s.style('opacity', function(d: any) {
        return d[0].trace.opacity;
    });

    s.selectAll('g.points').each(function(this: any, d: any) {
        const sel = select(this);
        const trace = d.trace || d[0].trace;
        stylePoints(sel, trace, gd);
    });

    s.selectAll('g.text').each(function(this: any, d: any) {
        const sel = select(this);
        const trace = d.trace || d[0].trace;
        styleText(sel, trace, gd);
    });

    s.selectAll('g.trace path.js-line')
        .call(lineGroupStyle);

    s.selectAll('g.trace path.js-fill')
        .call(fillGroupStyle, gd, false);

    Registry.getComponentMethod('errorbars', 'style')(s);
}

function stylePoints(sel: any, trace: FullTrace, gd: GraphDiv): void {
    pointStyle(sel.selectAll('path.point'), trace, gd);
}

function styleText(sel: any, trace: FullTrace, gd: GraphDiv): void {
    textPointStyle(sel.selectAll('text'), trace, gd);
}

function styleOnSelect(gd: GraphDiv, cd: CalcDatum[], sel: any): void {
    const trace = cd[0].trace;

    if(trace.selectedpoints) {
        selectedPointStyle(sel.selectAll('path.point'), trace);
        selectedTextStyle(sel.selectAll('text'), trace);
    } else {
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
