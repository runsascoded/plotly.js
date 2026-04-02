import type { GraphDiv, FullAxis } from '../../../types/core';
import { select } from 'd3-selection';
import isNumeric from 'fast-isnumeric';
import { setClipUrl } from '../drawing/index.js';
import subTypes from '../../traces/scatter/subtypes.js';

export default function plot(gd: GraphDiv, traces: any, plotinfo: any, transitionOpts: any): any {
    let isNew: boolean;

    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    const hasAnimation = transitionOpts && transitionOpts.duration > 0;
    const isStatic = gd._context.staticPlot;

    traces.each(function(this: any, d: any) {
        const trace = d[0].trace;
        const xObj = trace.error_x || {};
        const yObj = trace.error_y || {};

        let keyFunc: ((d: any) => any) | undefined;

        if(trace.ids) {
            keyFunc = function(d: any) {return d.id;};
        }

        const sparse = (
            subTypes.hasMarkers(trace) &&
            trace.marker.maxdisplayed > 0
        );

        if(!yObj.visible && !xObj.visible) d = [];

        const errorbars = select(this).selectAll('g.errorbar')
            .data(d, keyFunc);

        errorbars.exit().remove();

        if(!d.length) return;

        if(!xObj.visible) errorbars.selectAll('path.xerror').remove();
        if(!yObj.visible) errorbars.selectAll('path.yerror').remove();

        errorbars.style('opacity', 1);

        const enter = errorbars.enter().append('g')
            .classed('errorbar', true);

        if(hasAnimation) {
            enter.style('opacity', 0).transition()
                .duration(transitionOpts.duration)
                .style('opacity', 1);
        }

        const merged = errorbars.merge(enter);

        setClipUrl(merged, plotinfo.layerClipId, gd);

        merged.each(function(this: any, d: any) {
            const errorbar = select(this);
            const coords = errorCoords(d, xa, ya);

            if(sparse && !d.vis) return;

            let path: string;

            let yerror = errorbar.select('path.yerror');
            if(yObj.visible && isNumeric(coords.x) &&
                    isNumeric(coords.yh) &&
                    isNumeric(coords.ys)) {
                const yw = yObj.width;

                path = 'M' + (coords.x - yw) + ',' +
                    coords.yh + 'h' + (2 * yw) + // hat
                    'm-' + yw + ',0V' + coords.ys; // bar

                if(!coords.noYS) path += 'm-' + yw + ',0h' + (2 * yw); // shoe

                isNew = !yerror.size();

                if(isNew) {
                    yerror = errorbar.append('path')
                        .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke')
                        .classed('yerror', true);
                } else if(hasAnimation) {
                    yerror = yerror
                        .transition()
                            .duration(transitionOpts.duration)
                            .ease(transitionOpts.easing);
                }

                yerror.attr('d', path);
            } else yerror.remove();

            let xerror = errorbar.select('path.xerror');
            if(xObj.visible && isNumeric(coords.y) &&
                    isNumeric(coords.xh) &&
                    isNumeric(coords.xs)) {
                const xw = (xObj.copy_ystyle ? yObj : xObj).width;

                path = 'M' + coords.xh + ',' +
                    (coords.y - xw) + 'v' + (2 * xw) + // hat
                    'm0,-' + xw + 'H' + coords.xs; // bar

                if(!coords.noXS) path += 'm0,-' + xw + 'v' + (2 * xw); // shoe

                isNew = !xerror.size();

                if(isNew) {
                    xerror = errorbar.append('path')
                        .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke')
                        .classed('xerror', true);
                } else if(hasAnimation) {
                    xerror = xerror
                        .transition()
                            .duration(transitionOpts.duration)
                            .ease(transitionOpts.easing);
                }

                xerror.attr('d', path);
            } else xerror.remove();
        });
    });
}

function errorCoords(d: any, xa: FullAxis, ya: FullAxis): any {
    const out: Record<string, any> = {
        x: xa.c2p(d.x),
        y: ya.c2p(d.y)
    };

    if(d.yh !== undefined) {
        out.yh = ya.c2p(d.yh);
        out.ys = ya.c2p(d.ys);

        if(!isNumeric(out.ys)) {
            out.noYS = true;
            out.ys = ya.c2p(d.ys, true);
        }
    }

    if(d.xh !== undefined) {
        out.xh = xa.c2p(d.xh);
        out.xs = xa.c2p(d.xs);

        if(!isNumeric(out.xs)) {
            out.noXS = true;
            out.xs = xa.c2p(d.xs, true);
        }
    }

    return out;
}
