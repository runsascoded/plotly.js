import { select } from 'd3-selection';
import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import { setClipUrl } from '../../components/drawing/index.js';
import helpers from '../../plots/polar/helpers.js';
import type { GraphDiv } from '../../../types/core';

export default function plot(gd: GraphDiv, subplot: any, cdbar: any) {
    const isStatic = gd._context.staticPlot;
    const xa = subplot.xaxis;
    const ya = subplot.yaxis;
    const radialAxis = subplot.radialAxis;
    const angularAxis = subplot.angularAxis;
    const pathFn = makePathFn(subplot);
    const barLayer = subplot.layers.frontplot.select('g.barlayer');

    Lib.makeTraceGroups(barLayer, cdbar, 'trace bars').each(function(this: any) {
        const plotGroup = select(this);
        const pointGroup = Lib.ensureSingle(plotGroup, 'g', 'points');
        const bars = pointGroup.selectAll('g.point').data(Lib.identity);

        const barsEnter = bars.enter().append('g')
            .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke')
            .style('stroke-miterlimit', 2)
            .classed('point', true);

        bars.exit().remove();

        bars.merge(barsEnter).each(function(this: any, di: any) {
            const bar = select(this);

            const rp0 = di.rp0 = radialAxis.c2p(di.s0);
            const rp1 = di.rp1 = radialAxis.c2p(di.s1);
            const thetag0 = di.thetag0 = angularAxis.c2g(di.p0);
            const thetag1 = di.thetag1 = angularAxis.c2g(di.p1);

            let dPath;

            if(!isNumeric(rp0) || !isNumeric(rp1) ||
                !isNumeric(thetag0) || !isNumeric(thetag1) ||
                rp0 === rp1 || thetag0 === thetag1
            ) {
                // do not remove blank bars, to keep data-to-node
                // mapping intact during radial drag, that we
                // can skip calling _module.style during interactions
                dPath = 'M0,0Z';
            } else {
                // this 'center' pt is used for selections and hover labels
                const rg1 = radialAxis.c2g(di.s1);
                const thetagMid = (thetag0 + thetag1) / 2;
                di.ct = [
                    xa.c2p(rg1 * Math.cos(thetagMid)),
                    ya.c2p(rg1 * Math.sin(thetagMid))
                ];

                dPath = pathFn(rp0, rp1, thetag0, thetag1);
            }

            Lib.ensureSingle(bar, 'path').attr('d', dPath);
        });

        // clip plotGroup, when trace layer isn't clipped
        setClipUrl(
            plotGroup,
            subplot._hasClipOnAxisFalse ? subplot.clipIds.forTraces : null,
            gd
        );
    });
}

function makePathFn(subplot: any) {
    const cxx = subplot.cxx;
    const cyy = subplot.cyy;

    if(subplot.vangles) {
        return function(r0: any, r1: any, _a0: any, _a1: any) {
            let a0, a1;

            if(Lib.angleDelta(_a0, _a1) > 0) {
                a0 = _a0;
                a1 = _a1;
            } else {
                a0 = _a1;
                a1 = _a0;
            }

            const va0 = helpers.findEnclosingVertexAngles(a0, subplot.vangles)[0];
            const va1 = helpers.findEnclosingVertexAngles(a1, subplot.vangles)[1];
            const vaBar = [va0, (a0 + a1) / 2, va1];
            return helpers.pathPolygonAnnulus(r0, r1, a0, a1, vaBar, cxx, cyy);
        };
    }

    return function(r0: any, r1: any, a0: any, a1: any) {
        return Lib.pathAnnulus(r0, r1, a0, a1, cxx, cyy);
    };
}
