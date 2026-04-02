import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { font, lineGroupStyle } from '../../components/drawing/index.js';
import heatmapStyle from '../heatmap/style.js';
import makeColorMap from './make_color_map.js';

export default function style(gd: GraphDiv) {
    const contours = select(gd).selectAll('g.contour');

    contours.style('opacity', function(d) {
        return d[0].trace.opacity;
    });

    contours.each(function(d) {
        const c = select(this);
        const trace = d[0].trace;
        const contours = trace.contours;
        const line = trace.line;
        const cs = contours.size || 1;
        const start = contours.start;

        // for contourcarpet only - is this a constraint-type contour trace?
        const isConstraintType = contours.type === 'constraint';
        const colorLines = !isConstraintType && contours.coloring === 'lines';
        const colorFills = !isConstraintType && contours.coloring === 'fill';

        const colorMap = (colorLines || colorFills) ? makeColorMap(trace) : null;

        c.selectAll('g.contourlevel').each(function(d) {
            select(this).selectAll('path')
                .call(lineGroupStyle,
                    line.width,
                    colorLines ? colorMap(d.level) : line.color,
                    line.dash);
        });

        const labelFont = contours.labelfont;
        c.selectAll('g.contourlabels text').each(function(d) {
            font(select(this), {
                weight: labelFont.weight,
                style: labelFont.style,
                variant: labelFont.variant,
                textcase: labelFont.textcase,
                lineposition: labelFont.lineposition,
                shadow: labelFont.shadow,
                family: labelFont.family,
                size: labelFont.size,
                color: labelFont.color || (colorLines ? colorMap(d.level) : line.color)
            });
        });

        if(isConstraintType) {
            c.selectAll('g.contourfill path')
                .style('fill', trace.fillcolor);
        } else if(colorFills) {
            let firstFill;

            c.selectAll('g.contourfill path')
                .style('fill', function(d) {
                    if(firstFill === undefined) firstFill = d.level;
                    return colorMap(d.level + 0.5 * cs);
                });

            if(firstFill === undefined) firstFill = start;

            c.selectAll('g.contourbg path')
                .style('fill', colorMap(firstFill - 0.5 * cs));
        }
    });

    heatmapStyle(gd);
}
