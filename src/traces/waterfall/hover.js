import _axes from '../../plots/cartesian/axes.js';
const { hoverLabelText } = _axes;
import _index from '../../components/color/index.js';
const { opacity } = _index;
import _hover from '../bar/hover.js';
const { hoverOnBars } = _hover;
import delta from '../../constants/delta.js';
const DIRSYMBOL = {
    increasing: delta.INCREASING.SYMBOL,
    decreasing: delta.DECREASING.SYMBOL
};
export default function hoverPoints(pointData, xval, yval, hovermode, opts) {
    const point = hoverOnBars(pointData, xval, yval, hovermode, opts);
    if (!point)
        return;
    const cd = point.cd;
    const trace = cd[0].trace;
    const isHorizontal = (trace.orientation === 'h');
    const vLetter = isHorizontal ? 'x' : 'y';
    const vAxis = isHorizontal ? pointData.xa : pointData.ya;
    function formatNumber(a) {
        return hoverLabelText(vAxis, a, trace[vLetter + 'hoverformat']);
    }
    // the closest data point
    const index = point.index;
    const di = cd[index];
    const size = (di.isSum) ? di.b + di.s : di.rawS;
    point.initial = di.b + di.s - size;
    point.delta = size;
    point.final = point.initial + point.delta;
    const v = formatNumber(Math.abs(point.delta));
    point.deltaLabel = size < 0 ? '(' + v + ')' : v;
    point.finalLabel = formatNumber(point.final);
    point.initialLabel = formatNumber(point.initial);
    const hoverinfo = di.hi || trace.hoverinfo;
    const text = [];
    if (hoverinfo && hoverinfo !== 'none' && hoverinfo !== 'skip') {
        const isAll = (hoverinfo === 'all');
        const parts = hoverinfo.split('+');
        const hasFlag = (flag) => { return isAll || parts.indexOf(flag) !== -1; };
        if (!di.isSum) {
            if (hasFlag('final') &&
                (isHorizontal ? !hasFlag('x') : !hasFlag('y')) // don't display redundant info.
            ) {
                text.push(point.finalLabel);
            }
            if (hasFlag('delta')) {
                if (size < 0) {
                    text.push(point.deltaLabel + ' ' + DIRSYMBOL.decreasing);
                }
                else {
                    text.push(point.deltaLabel + ' ' + DIRSYMBOL.increasing);
                }
            }
            if (hasFlag('initial')) {
                text.push('Initial: ' + point.initialLabel);
            }
        }
    }
    if (text.length)
        point.extraText = text.join('<br>');
    point.color = getTraceColor(trace, di);
    return [point];
}
function getTraceColor(trace, di) {
    const cont = trace[di.dir].marker;
    const mc = cont.color;
    const mlc = cont.line.color;
    const mlw = cont.line.width;
    if (opacity(mc))
        return mc;
    else if (opacity(mlc) && mlw)
        return mlc;
}
