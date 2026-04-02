import type { FullTrace, GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import Lib from '../../lib/index.js';
import helpers from '../sunburst/helpers.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;
import fillOne from '../sunburst/fill_one.js';

function style(gd: GraphDiv): void {
    const s = gd._fullLayout._treemaplayer.selectAll('.trace');
    resizeText(gd, s, 'treemap');

    s.each(function(this: any, cd) {
        const gTrace = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;

        gTrace.style('opacity', trace.opacity);

        gTrace.selectAll('path.surface').each(function(this: any, pt) {
            select(this).call(styleOne, pt, trace, gd, {
                hovered: false
            });
        });
    });
}

function styleOne(s: any, pt: any, trace: FullTrace, gd: GraphDiv, opts?: any): void {
    const hovered = (opts || {}).hovered;
    const cdi = pt.data.data;
    const ptNumber = cdi.i;
    let lineColor;
    let lineWidth;
    let fillColor = cdi.color;
    const isRoot = helpers.isHierarchyRoot(pt);
    let opacity = 1;

    if(hovered) {
        lineColor = trace._hovered.marker.line.color;
        lineWidth = trace._hovered.marker.line.width;
    } else {
        if(isRoot && fillColor === trace.root.color) {
            opacity = 100;
            lineColor = 'rgba(0,0,0,0)';
            lineWidth = 0;
        } else {
            lineColor = Lib.castOption(trace, ptNumber, 'marker.line.color') || Color.defaultLine;
            lineWidth = Lib.castOption(trace, ptNumber, 'marker.line.width') || 0;

            if(!trace._hasColorscale && !pt.onPathbar) {
                const depthfade = trace.marker.depthfade;
                if(depthfade) {
                    const fadedColor = Color.combine(Color.addOpacity(trace._backgroundColor, 0.75), fillColor);
                    let n;

                    if(depthfade === true) {
                        const maxDepth = helpers.getMaxDepth(trace);
                        if(isFinite(maxDepth)) {
                            if(helpers.isLeaf(pt)) {
                                n = 0;
                            } else {
                                n = (trace._maxVisibleLayers) - (pt.data.depth - trace._entryDepth);
                            }
                        } else {
                            n = pt.data.height + 1;
                        }
                    } else { // i.e. case of depthfade === 'reversed'
                        n = pt.data.depth - trace._entryDepth;
                        if(!trace._atRootLevel) n++;
                    }

                    if(n > 0) {
                        for(let i = 0; i < n; i++) {
                            const ratio = 0.5 * i / n;
                            fillColor = Color.combine(Color.addOpacity(fadedColor, ratio), fillColor);
                        }
                    }
                }
            }
        }
    }

    s.call(fillOne, pt, trace, gd, fillColor)
        .style('stroke-width', lineWidth)
        .call(Color.stroke, lineColor)
        .style('opacity', opacity);
}

export default {
    style: style,
    styleOne: styleOne
};
