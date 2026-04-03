import helpers from './helpers.js';
import _hover from '../scattergl/hover.js';
const { calcHover } = _hover;
import _axes from '../../plots/cartesian/axes.js';
const { getFromId } = _axes;
import { extendFlat } from '../../lib/extend.js';
function hoverPoints(pointData, xval, yval, hovermode, opts) {
    if (!opts)
        opts = {};
    const hovermodeHasX = (hovermode || '').charAt(0) === 'x';
    const hovermodeHasY = (hovermode || '').charAt(0) === 'y';
    let points = _hoverPoints(pointData, xval, yval);
    if ((hovermodeHasX || hovermodeHasY) && opts.hoversubplots === 'axis' && points[0]) {
        const subplotsWith = (hovermodeHasX ?
            pointData.xa :
            pointData.ya)._subplotsWith;
        const gd = opts.gd;
        const _pointData = extendFlat({}, pointData);
        for (let i = 0; i < subplotsWith.length; i++) {
            const spId = subplotsWith[i];
            // do not reselect on the initial subplot
            if (spId === (pointData.xa._id + pointData.ya._id))
                continue;
            if (hovermodeHasY) {
                _pointData.xa = getFromId(gd, spId, 'x');
            }
            else { // hovermodeHasX
                _pointData.ya = getFromId(gd, spId, 'y');
            }
            const axisHoversubplots = hovermodeHasX || hovermodeHasY;
            const newPoints = _hoverPoints(_pointData, xval, yval, axisHoversubplots);
            points = points.concat(newPoints);
        }
    }
    return points;
}
function _hoverPoints(pointData, xval, yval, axisHoversubplots) {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const scene = pointData.scene;
    const cdata = scene.matrixOptions.cdata;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const xpx = xa.c2p(xval);
    const ypx = ya.c2p(yval);
    const maxDistance = pointData.distance;
    const xi = helpers.getDimIndex(trace, xa);
    const yi = helpers.getDimIndex(trace, ya);
    if (xi === false || yi === false)
        return [pointData];
    const x = cdata[xi];
    const y = cdata[yi];
    let id, dxy;
    let minDist = maxDistance;
    for (let i = 0; i < x.length; i++) {
        if (axisHoversubplots && i !== pointData.index)
            continue;
        const ptx = x[i];
        const pty = y[i];
        const dx = xa.c2p(ptx) - xpx;
        const dy = ya.c2p(pty) - ypx;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (axisHoversubplots || dist < minDist) {
            minDist = dxy = dist;
            id = i;
        }
    }
    pointData.index = id;
    pointData.distance = minDist;
    pointData.dxy = dxy;
    if (id === undefined)
        return [pointData];
    return [calcHover(pointData, x, y, trace)];
}
export default {
    hoverPoints: hoverPoints
};
