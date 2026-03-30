import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import { pointStyle, selectedPointStyle } from '../../components/drawing/index.js';

function style(gd, cd, sel) {
    var s = sel ? sel : select(gd).selectAll('g.trace.boxes');

    s.style('opacity', function(d) { return d[0].trace.opacity; });

    s.each(function(d) {
        var el = select(this);
        var trace = d[0].trace;
        var lineWidth = trace.line.width;

        function styleBox(boxSel, lineWidth, lineColor, fillColor) {
            boxSel.style('stroke-width', lineWidth + 'px')
                .call(Color.stroke, lineColor)
                .call(Color.fill, fillColor);
        }

        var allBoxes = el.selectAll('path.box');

        if(trace.type === 'candlestick') {
            allBoxes.each(function(boxData) {
                if(boxData.empty) return;

                var thisBox = select(this);
                var container = trace[boxData.dir]; // dir = 'increasing' or 'decreasing'
                styleBox(thisBox, container.line.width, container.line.color, container.fillcolor);
                // TODO: custom selection style for candlesticks
                thisBox.style('opacity', trace.selectedpoints && !boxData.selected ? 0.3 : 1);
            });
        } else {
            styleBox(allBoxes, lineWidth, trace.line.color, trace.fillcolor);
            el.selectAll('path.mean')
                .style({
                    'stroke-width': lineWidth,
                    'stroke-dasharray': (2 * lineWidth) + 'px,' + lineWidth + 'px'
                })
                .call(Color.stroke, trace.line.color);

            var pts = el.selectAll('path.point');
            pointStyle(pts, trace, gd);
        }
    });
}

function styleOnSelect(gd, cd, sel) {
    var trace = cd[0].trace;
    var pts = sel.selectAll('path.point');

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
