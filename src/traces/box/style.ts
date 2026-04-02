import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import { pointStyle, selectedPointStyle } from '../../components/drawing/index.js';

function style(gd: GraphDiv, cd?: any[], sel?: any): any {
    const s = sel ? sel : select(gd).selectAll('g.trace.boxes');

    s.style('opacity', function(d: any) { return d[0].trace.opacity; });

    s.each(function(this: any, d: any) {
        const el = select(this);
        const trace = d[0].trace;
        const lineWidth = trace.line.width;

        function styleBox(boxSel: any, lineWidth: any, lineColor: any, fillColor: any) {
            boxSel.style('stroke-width', lineWidth + 'px')
                .call(Color.stroke, lineColor)
                .call(Color.fill, fillColor);
        }

        const allBoxes = el.selectAll('path.box');

        if(trace.type === 'candlestick') {
            allBoxes.each(function(this: any, boxData: any) {
                if(boxData.empty) return;

                const thisBox = select(this);
                const container = trace[boxData.dir]; // dir = 'increasing' or 'decreasing'
                styleBox(thisBox, container.line.width, container.line.color, container.fillcolor);
                // TODO: custom selection style for candlesticks
                thisBox.style('opacity', trace.selectedpoints && !boxData.selected ? 0.3 : 1);
            });
        } else {
            styleBox(allBoxes, lineWidth, trace.line.color, trace.fillcolor);
            el.selectAll('path.mean')
                .style('stroke-width', lineWidth)
                .style('stroke-dasharray', (2 * lineWidth) + 'px,' + lineWidth + 'px')
                .call(Color.stroke, trace.line.color);

            const pts = el.selectAll('path.point');
            pointStyle(pts, trace, gd);
        }
    });
}

function styleOnSelect(gd: GraphDiv, cd: any[], sel: any): void {
    const trace = cd[0].trace;
    const pts = sel.selectAll('path.point');

    if(trace.selectedpoints) {
        selectedPointStyle(pts, trace);
    } else {
        pointStyle(pts, trace, gd);
    }
}

export default {
    style: style,
    styleOnSelect: styleOnSelect
};
