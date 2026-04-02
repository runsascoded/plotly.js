import type { FullTrace } from '../../../types/core';
import _index from '../../components/color/index.js';
const { opacity } = _index;
import _hover from '../bar/hover.js';
const { hoverOnBars } = _hover;
import _index2 from '../../lib/index.js';
const { formatPercent } = _index2;

export default function hoverPoints(pointData,  xval,  yval,  hovermode,  opts) {
    const point = hoverOnBars(pointData, xval, yval, hovermode, opts);
    if(!point) return;

    const cd = point.cd;
    const trace = cd[0].trace;
    const isHorizontal = (trace.orientation === 'h');

    // the closest data point
    const index = point.index;
    const di = cd[index];

    const sizeLetter = isHorizontal ? 'x' : 'y';
    point[sizeLetter + 'LabelVal'] = di.s;

    point.percentInitial = di.begR;
    point.percentInitialLabel = formatPercent(di.begR, 1);

    point.percentPrevious = di.difR;
    point.percentPreviousLabel = formatPercent(di.difR, 1);

    point.percentTotal = di.sumR;
    point.percentTotalLabel = formatPercent(di.sumR, 1);

    const hoverinfo = di.hi || trace.hoverinfo;
    const text: any[] = [];
    if(hoverinfo && hoverinfo !== 'none' && hoverinfo !== 'skip') {
        const isAll = (hoverinfo === 'all');
        const parts = hoverinfo.split('+');

        const hasFlag = function(flag) { return isAll || parts.indexOf(flag) !== -1; };

        if(hasFlag('percent initial')) {
            text.push(point.percentInitialLabel + ' of initial');
        }
        if(hasFlag('percent previous')) {
            text.push(point.percentPreviousLabel + ' of previous');
        }
        if(hasFlag('percent total')) {
            text.push(point.percentTotalLabel + ' of total');
        }
    }
    point.extraText = text.join('<br>');

    point.color = getTraceColor(trace, di);

    return [point];
}

function getTraceColor(trace: FullTrace,  di) {
    const cont = trace.marker;
    const mc = di.mc || cont.color;
    const mlc = di.mlc || cont.line.color;
    const mlw = di.mlw || cont.line.width;
    if(opacity(mc)) return mc;
    else if(opacity(mlc) && mlw) return mlc;
}
