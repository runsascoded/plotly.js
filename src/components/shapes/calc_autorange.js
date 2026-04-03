import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import constants from './constants.js';
import helpers from './helpers.js';
export default function calcAutorange(gd) {
    const fullLayout = gd._fullLayout;
    const shapeList = Lib.filterVisible(fullLayout.shapes);
    if (!shapeList.length || !gd._fullData.length)
        return;
    for (let i = 0; i < shapeList.length; i++) {
        const shape = shapeList[i];
        shape._extremes = {};
        let ax, bounds;
        const xRefType = Axes.getRefType(shape.xref);
        const yRefType = Axes.getRefType(shape.yref);
        // paper and axis domain referenced shapes don't affect autorange
        if (shape.xref !== 'paper' && xRefType !== 'domain') {
            ax = Axes.getFromId(gd, shape.xref);
            bounds = shapeBounds(ax, shape, constants.paramIsX);
            if (bounds) {
                shape._extremes[ax._id] = Axes.findExtremes(ax, bounds, calcXPaddingOptions(shape));
            }
        }
        if (shape.yref !== 'paper' && yRefType !== 'domain') {
            ax = Axes.getFromId(gd, shape.yref);
            bounds = shapeBounds(ax, shape, constants.paramIsY);
            if (bounds) {
                shape._extremes[ax._id] = Axes.findExtremes(ax, bounds, calcYPaddingOptions(shape));
            }
        }
    }
}
function calcXPaddingOptions(shape) {
    return calcPaddingOptions(shape.line.width, shape.xsizemode, shape.x0, shape.x1, shape.path, false);
}
function calcYPaddingOptions(shape) {
    return calcPaddingOptions(shape.line.width, shape.ysizemode, shape.y0, shape.y1, shape.path, true);
}
function calcPaddingOptions(lineWidth, sizeMode, v0, v1, path, isYAxis) {
    const ppad = lineWidth / 2;
    const axisDirectionReverted = isYAxis;
    if (sizeMode === 'pixel') {
        const coords = path ?
            helpers.extractPathCoords(path, isYAxis ? constants.paramIsY : constants.paramIsX) :
            [v0, v1];
        const maxValue = Lib.aggNums(Math.max, null, coords);
        const minValue = Lib.aggNums(Math.min, null, coords);
        const beforePad = minValue < 0 ? Math.abs(minValue) + ppad : ppad;
        const afterPad = maxValue > 0 ? maxValue + ppad : ppad;
        return {
            ppad: ppad,
            ppadplus: axisDirectionReverted ? beforePad : afterPad,
            ppadminus: axisDirectionReverted ? afterPad : beforePad
        };
    }
    else {
        return { ppad: ppad };
    }
}
function shapeBounds(ax, shape, paramsToUse) {
    const dim = ax._id.charAt(0) === 'x' ? 'x' : 'y';
    const isCategory = ax.type === 'category' || ax.type === 'multicategory';
    let v0;
    let v1;
    let shiftStart = 0;
    let shiftEnd = 0;
    let convertVal = isCategory ? ax.r2c : ax.d2c;
    const isSizeModeScale = shape[dim + 'sizemode'] === 'scaled';
    if (isSizeModeScale) {
        v0 = shape[dim + '0'];
        v1 = shape[dim + '1'];
        if (isCategory) {
            shiftStart = shape[dim + '0shift'];
            shiftEnd = shape[dim + '1shift'];
        }
    }
    else {
        v0 = shape[dim + 'anchor'];
        v1 = shape[dim + 'anchor'];
    }
    if (v0 !== undefined)
        return [convertVal(v0) + shiftStart, convertVal(v1) + shiftEnd];
    if (!shape.path)
        return;
    let min = Infinity;
    let max = -Infinity;
    const segments = shape.path.match(constants.segmentRE);
    let i;
    let segment;
    let drawnParam;
    let params;
    let val;
    if (ax.type === 'date')
        convertVal = helpers.decodeDate(convertVal);
    for (i = 0; i < segments.length; i++) {
        segment = segments[i];
        drawnParam = paramsToUse[segment.charAt(0)].drawn;
        if (drawnParam === undefined)
            continue;
        params = segments[i].slice(1).match(constants.paramRE);
        if (!params || params.length < drawnParam)
            continue;
        val = convertVal(params[drawnParam]);
        if (val < min)
            min = val;
        if (val > max)
            max = val;
    }
    if (max >= min)
        return [min, max];
}
