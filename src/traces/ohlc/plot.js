import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
export default function plot(gd, plotinfo, cdOHLC, ohlcLayer) {
    const ya = plotinfo.yaxis;
    const xa = plotinfo.xaxis;
    const posHasRangeBreaks = !!xa.rangebreaks;
    Lib.makeTraceGroups(ohlcLayer, cdOHLC, 'trace ohlc').each(function (cd) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const t = cd0.t;
        const trace = cd0.trace;
        if (trace.visible !== true || t.empty) {
            plotGroup.remove();
            return;
        }
        const tickLen = t.tickLen;
        const paths = plotGroup.selectAll('path').data(Lib.identity);
        const pathsEnter = paths.enter().append('path');
        paths.exit().remove();
        paths.merge(pathsEnter).attr('d', function (d) {
            if (d.empty)
                return 'M0,0Z';
            const xo = xa.c2p(d.pos - tickLen, true);
            const xc = xa.c2p(d.pos + tickLen, true);
            const x = posHasRangeBreaks ? (xo + xc) / 2 : xa.c2p(d.pos, true);
            const yo = ya.c2p(d.o, true);
            const yh = ya.c2p(d.h, true);
            const yl = ya.c2p(d.l, true);
            const yc = ya.c2p(d.c, true);
            return 'M' + xo + ',' + yo + 'H' + x +
                'M' + x + ',' + yh + 'V' + yl +
                'M' + xc + ',' + yc + 'H' + x;
        });
    });
}
