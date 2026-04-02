import type { FullAxis, GraphDiv } from '../../../types/core';
import constants from './constants.js';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';

export function rangeToShapePosition(ax: FullAxis) {
    return (ax.type === 'log') ? ax.r2d : function(v: any) { return v; };
}

export function shapePositionToRange(ax: FullAxis) {
    return (ax.type === 'log') ? ax.d2r : function(v: any, _clip?: any) { return v; };
}

export function decodeDate(convertToPx: any) {
    return function(v: any) {
        if(v.replace) v = v.replace('_', ' ');
        return convertToPx(v);
    };
}

export function encodeDate(convertToDate: any) {
    return function(v: any) { return convertToDate(v).replace(' ', '_'); };
}

export function extractPathCoords(path: any, paramsToUse: any, isRaw?: any) {
    const extractedCoordinates: any[] = [];

    const segments = path.match(constants.segmentRE);
    segments.forEach((segment: any) => {
        const relevantParamIdx = paramsToUse[segment.charAt(0)].drawn;
        if(relevantParamIdx === undefined) return;

        const params = segment.slice(1).match(constants.paramRE);
        if(!params || params.length < relevantParamIdx) return;

        const str = params[relevantParamIdx];
        const pos = isRaw ? str : Lib.cleanNumber(str);

        extractedCoordinates.push(pos);
    });

    return extractedCoordinates;
}

export function getDataToPixel(gd: GraphDiv, axis: FullAxis, shift: any, isVertical: any, refType: any) {
    const gs = gd._fullLayout._size;
    let dataToPixel;

    if(axis) {
        if(refType === 'domain') {
            dataToPixel = function(v: any) {
                return axis._length * (isVertical ? (1 - v) : v) + axis._offset;
            };
        } else {
            const d2r = shapePositionToRange(axis);

            dataToPixel = function(v: any) {
                const shiftPixels = getPixelShift(axis, shift);
                return axis._offset + axis.r2p(d2r(v, true)) + shiftPixels;
            };

            if(axis.type === 'date') dataToPixel = decodeDate(dataToPixel);
        }
    } else if(isVertical) {
        dataToPixel = function(v: any) { return gs.t + gs.h * (1 - v); };
    } else {
        dataToPixel = function(v: any) { return gs.l + gs.w * v; };
    }

    return dataToPixel;
}

export function getPixelToData(gd: GraphDiv, axis: FullAxis, isVertical: any, opt: any) {
    const gs = gd._fullLayout._size;
    let pixelToData;

    if(axis) {
        if(opt === 'domain') {
            pixelToData = function(p: any) {
                const q = (p - axis._offset) / axis._length;
                return isVertical ? 1 - q : q;
            };
        } else {
            const r2d = rangeToShapePosition(axis);
            pixelToData = function(p: any) { return r2d(axis.p2r(p - axis._offset)); };
        }
    } else if(isVertical) {
        pixelToData = function(p: any) { return 1 - (p - gs.t) / gs.h; };
    } else {
        pixelToData = function(p: any) { return (p - gs.l) / gs.w; };
    }

    return pixelToData;
}

export function roundPositionForSharpStrokeRendering(pos: any, strokeWidth: any) {
    const strokeWidthIsOdd = Math.round(strokeWidth % 2) === 1;
    const posValAsInt = Math.round(pos);

    return strokeWidthIsOdd ? posValAsInt + 0.5 : posValAsInt;
}

export function makeShapesOptionsAndPlotinfo(gd: GraphDiv, index: any) {
    const options = gd._fullLayout.shapes![index] || {};

    let plotinfo: any = gd._fullLayout._plots[options.xref + options.yref];
    const hasPlotinfo = !!plotinfo;
    if(hasPlotinfo) {
        plotinfo._hadPlotinfo = true;
    } else {
        plotinfo = {};
        if(options.xref && options.xref !== 'paper') plotinfo.xaxis = gd._fullLayout[options.xref + 'axis'];
        if(options.yref && options.yref !== 'paper') plotinfo.yaxis = gd._fullLayout[options.yref + 'axis'];
    }

    plotinfo.xsizemode = options.xsizemode;
    plotinfo.ysizemode = options.ysizemode;
    plotinfo.xanchor = options.xanchor;
    plotinfo.yanchor = options.yanchor;

    return {
        options: options,
        plotinfo: plotinfo
    };
}

export function makeSelectionsOptionsAndPlotinfo(gd: GraphDiv, index: any) {
    const options = gd._fullLayout.selections[index] || {};

    let plotinfo: any = gd._fullLayout._plots[options.xref + options.yref];
    const hasPlotinfo = !!plotinfo;
    if(hasPlotinfo) {
        plotinfo._hadPlotinfo = true;
    } else {
        plotinfo = {};
        if(options.xref) plotinfo.xaxis = gd._fullLayout[options.xref + 'axis'];
        if(options.yref) plotinfo.yaxis = gd._fullLayout[options.yref + 'axis'];
    }

    return {
        options: options,
        plotinfo: plotinfo
    };
}

export function getPathString(gd: GraphDiv, options: any) {
    const type = options.type;
    const xRefType = Axes.getRefType(options.xref);
    const yRefType = Axes.getRefType(options.yref);
    const xa = Axes.getFromId(gd, options.xref);
    const ya = Axes.getFromId(gd, options.yref);
    const gs = gd._fullLayout._size;
    let x2r: any, x2p, y2r: any, y2p;
    const xShiftStart = getPixelShift(xa, options.x0shift);
    const xShiftEnd = getPixelShift(xa, options.x1shift);
    const yShiftStart = getPixelShift(ya, options.y0shift);
    const yShiftEnd = getPixelShift(ya, options.y1shift);
    let x0, x1, y0, y1;

    if(xa) {
        if(xRefType === 'domain') {
            x2p = function(v: any) { return xa._offset + xa._length * v; };
        } else {
            x2r = shapePositionToRange(xa);
            x2p = function(v: any) { return xa._offset + xa.r2p(x2r(v, true)); };
        }
    } else {
        x2p = function(v: any) { return gs.l + gs.w * v; };
    }

    if(ya) {
        if(yRefType === 'domain') {
            y2p = function(v: any) { return ya._offset + ya._length * (1 - v); };
        } else {
            y2r = shapePositionToRange(ya);
            y2p = function(v: any) { return ya._offset + ya.r2p(y2r(v, true)); };
        }
    } else {
        y2p = function(v: any) { return gs.t + gs.h * (1 - v); };
    }

    if(type === 'path') {
        if(xa && xa.type === 'date') x2p = decodeDate(x2p);
        if(ya && ya.type === 'date') y2p = decodeDate(y2p);
        return convertPath(options, x2p, y2p);
    }
    if(options.xsizemode === 'pixel') {
        const xAnchorPos = x2p(options.xanchor);
        x0 = xAnchorPos + options.x0 + xShiftStart;
        x1 = xAnchorPos + options.x1 + xShiftEnd;
    } else {
        x0 = x2p(options.x0) + xShiftStart;
        x1 = x2p(options.x1) + xShiftEnd;
    }

    if(options.ysizemode === 'pixel') {
        const yAnchorPos = y2p(options.yanchor);
        y0 = yAnchorPos - options.y0 + yShiftStart;
        y1 = yAnchorPos - options.y1 + yShiftEnd;
    } else {
        y0 = y2p(options.y0) + yShiftStart;
        y1 = y2p(options.y1) + yShiftEnd;
    }

    if(type === 'line') return 'M' + x0 + ',' + y0 + 'L' + x1 + ',' + y1;
    if(type === 'rect') return 'M' + x0 + ',' + y0 + 'H' + x1 + 'V' + y1 + 'H' + x0 + 'Z';

    // circle
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.abs(cx - x0);
    const ry = Math.abs(cy - y0);
    const rArc = 'A' + rx + ',' + ry;
    const rightPt = (cx + rx) + ',' + cy;
    const topPt = cx + ',' + (cy - ry);
    return 'M' + rightPt + rArc + ' 0 1,1 ' + topPt +
        rArc + ' 0 0,1 ' + rightPt + 'Z';
}

function convertPath(options: any, x2p: any, y2p: any) {
    const pathIn = options.path;
    const xSizemode = options.xsizemode;
    const ySizemode = options.ysizemode;
    const xAnchor = options.xanchor;
    const yAnchor = options.yanchor;

    return pathIn.replace(constants.segmentRE, function(segment: any) {
        let paramNumber = 0;
        const segmentType = segment.charAt(0);
        const xParams = (constants.paramIsX as any)[segmentType];
        const yParams = (constants.paramIsY as any)[segmentType];
        const nParams = (constants.numParams as any)[segmentType];

        let paramString = segment.slice(1).replace(constants.paramRE, function(param: any) {
            if(xParams[paramNumber]) {
                if(xSizemode === 'pixel') param = x2p(xAnchor) + Number(param);
                else param = x2p(param);
            } else if(yParams[paramNumber]) {
                if(ySizemode === 'pixel') param = y2p(yAnchor) - Number(param);
                else param = y2p(param);
            }
            paramNumber++;

            if(paramNumber > nParams) param = 'X';
            return param;
        });

        if(paramNumber > nParams) {
            paramString = paramString.replace(/[\s,]*X.*/, '');
            Lib.log('Ignoring extra params in segment ' + segment);
        }

        return segmentType + paramString;
    });
}

function getPixelShift(axis: any, shift: any) {
    shift = shift || 0;
    let shiftPixels = 0;
    if(shift && axis && (axis.type === 'category' || axis.type === 'multicategory')) {
        shiftPixels = (axis.r2p(1) - axis.r2p(0)) * shift;
    }
    return shiftPixels;
}

export default { rangeToShapePosition, shapePositionToRange, decodeDate, encodeDate, extractPathCoords, getDataToPixel, getPixelToData, roundPositionForSharpStrokeRendering, makeShapesOptionsAndPlotinfo, makeSelectionsOptionsAndPlotinfo, getPathString };
