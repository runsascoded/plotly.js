import type { FullAxis, GraphDiv, PlotInfo } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import { setClipUrl } from '../../components/drawing/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import barPlot from '../bar/plot.js';
import _uniform_text from '../bar/uniform_text.js';
const { clearMinTextSize } = _uniform_text;

export default function plot(gd: GraphDiv,  plotinfo: PlotInfo,  cdModule,  traceLayer) {
    const fullLayout = gd._fullLayout;

    clearMinTextSize('funnel', fullLayout);

    plotConnectorRegions(gd, plotinfo, cdModule, traceLayer);
    plotConnectorLines(gd, plotinfo, cdModule, traceLayer);

    (barPlot.plot as any)(gd, plotinfo, cdModule, traceLayer, {
        mode: fullLayout.funnelmode,
        norm: fullLayout.funnelmode,
        gap: fullLayout.funnelgap,
        groupgap: fullLayout.funnelgroupgap
    });
}

function plotConnectorRegions(gd: GraphDiv,  plotinfo: PlotInfo,  cdModule,  traceLayer) {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    Lib.makeTraceGroups(traceLayer, cdModule, 'trace bars').each(function(cd) {
        const plotGroup = select(this);
        const trace = cd[0].trace;

        const group = Lib.ensureSingle(plotGroup, 'g', 'regions');

        if(!trace.connector || !trace.connector.visible) {
            group.remove();
            return;
        }

        const isHorizontal = (trace.orientation === 'h');

        const connectors = group.selectAll('g.region').data(Lib.identity);

        connectors.enter().append('g')
            .classed('region', true);

        connectors.exit().remove();

        const len = connectors.size();

        connectors.each(function(di, i) {
            // don't draw lines between nulls
            if(i !== len - 1 && !di.cNext) return;

            const xy = getXY(di, xa, ya, isHorizontal);
            const x = xy[0];
            const y = xy[1];

            let shape = '';

            if(
                x[0] !== BADNUM && y[0] !== BADNUM &&
                x[1] !== BADNUM && y[1] !== BADNUM &&
                x[2] !== BADNUM && y[2] !== BADNUM &&
                x[3] !== BADNUM && y[3] !== BADNUM
            ) {
                if(isHorizontal) {
                    shape += 'M' + x[0] + ',' + y[1] + 'L' + x[2] + ',' + y[2] + 'H' + x[3] + 'L' + x[1] + ',' + y[1] + 'Z';
                } else {
                    shape += 'M' + x[1] + ',' + y[1] + 'L' + x[2] + ',' + y[3] + 'V' + y[2] + 'L' + x[1] + ',' + y[0] + 'Z';
                }
            }

            if(shape === '') shape = 'M0,0Z';

            Lib.ensureSingle(select(this), 'path')
                .attr('d', shape)
                .call(setClipUrl, plotinfo.layerClipId, gd);
        });
    });
}

function plotConnectorLines(gd: GraphDiv,  plotinfo: PlotInfo,  cdModule,  traceLayer) {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    Lib.makeTraceGroups(traceLayer, cdModule, 'trace bars').each(function(cd) {
        const plotGroup = select(this);
        const trace = cd[0].trace;

        const group = Lib.ensureSingle(plotGroup, 'g', 'lines');

        if(!trace.connector || !trace.connector.visible || !trace.connector.line.width) {
            group.remove();
            return;
        }

        const isHorizontal = (trace.orientation === 'h');

        const connectors = group.selectAll('g.line').data(Lib.identity);

        connectors.enter().append('g')
            .classed('line', true);

        connectors.exit().remove();

        const len = connectors.size();

        connectors.each(function(di, i) {
            // don't draw lines between nulls
            if(i !== len - 1 && !di.cNext) return;

            const xy = getXY(di, xa, ya, isHorizontal);
            const x = xy[0];
            const y = xy[1];

            let shape = '';

            if(x[3] !== undefined && y[3] !== undefined) {
                if(isHorizontal) {
                    shape += 'M' + x[0] + ',' + y[1] + 'L' + x[2] + ',' + y[2];
                    shape += 'M' + x[1] + ',' + y[1] + 'L' + x[3] + ',' + y[2];
                } else {
                    shape += 'M' + x[1] + ',' + y[1] + 'L' + x[2] + ',' + y[3];
                    shape += 'M' + x[1] + ',' + y[0] + 'L' + x[2] + ',' + y[2];
                }
            }

            if(shape === '') shape = 'M0,0Z';

            Lib.ensureSingle(select(this), 'path')
                .attr('d', shape)
                .call(setClipUrl, plotinfo.layerClipId, gd);
        });
    });
}

function getXY(di,  xa: FullAxis,  ya: FullAxis,  isHorizontal) {
    const s = [];
    const p = [];

    const sAxis = isHorizontal ? xa : ya;
    const pAxis = isHorizontal ? ya : xa;

    s[0] = sAxis.c2p(di.s0, true);
    p[0] = pAxis.c2p(di.p0, true);

    s[1] = sAxis.c2p(di.s1, true);
    p[1] = pAxis.c2p(di.p1, true);

    s[2] = sAxis.c2p(di.nextS0, true);
    p[2] = pAxis.c2p(di.nextP0, true);

    s[3] = sAxis.c2p(di.nextS1, true);
    p[3] = pAxis.c2p(di.nextP1, true);

    return isHorizontal ? [s, p] : [p, s];
}
