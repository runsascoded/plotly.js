import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import { dashLine, selectedPointStyle } from '../../components/drawing/index.js';
import Colorscale from '../../components/colorscale/index.js';

function style(gd, calcTrace) {
    if(calcTrace) styleTrace(gd, calcTrace);
}

function styleTrace(gd, calcTrace) {
    var trace = calcTrace[0].trace;
    var s = calcTrace[0].node3;
    var locs = s.selectAll('.choroplethlocation');
    var marker = trace.marker || {};
    var markerLine = marker.line || {};

    var sclFunc = Colorscale.makeColorScaleFuncFromTrace(trace);

    locs.each(function(d) {
        select(this)
            .attr('fill', sclFunc(d.z))
            .call(Color.stroke, d.mlc || markerLine.color)
            .call(dashLine, '', d.mlw || markerLine.width || 0)
            .style('opacity', marker.opacity);
    });

    selectedPointStyle(locs, trace);
}

function styleOnSelect(gd, calcTrace) {
    var s = calcTrace[0].node3;
    var trace = calcTrace[0].trace;

    if(trace.selectedpoints) {
        selectedPointStyle(s.selectAll('.choroplethlocation'), trace);
    } else {
        styleTrace(gd, calcTrace);
    }
}

export default {
    style: style,
    styleOnSelect: styleOnSelect
};
