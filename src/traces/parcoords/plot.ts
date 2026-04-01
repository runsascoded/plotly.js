import parcoords from './parcoords.js';
import prepareRegl from '../../lib/prepare_regl.js';
import { isVisible } from './helpers.js';
import type { GraphDiv } from '../../../types/core';
var reglPrecompiled: any = {};

function newIndex(visibleIndices: any, orig: any, dim: any) {
    var origIndex = orig.indexOf(dim);
    var currentIndex = visibleIndices.indexOf(origIndex);
    if(currentIndex === -1) {
        currentIndex += orig.length;
    }
    return currentIndex;
}

function sorter(visibleIndices: any, orig: any) {
    return function sorter(d1: any, d2: any) {
        return (
            newIndex(visibleIndices, orig, d1) -
            newIndex(visibleIndices, orig, d2)
        );
    };
}

function plot(gd: GraphDiv, cdModule: any) {
    var fullLayout = gd._fullLayout;

    var success = prepareRegl(gd, [], reglPrecompiled);
    if(!success) return;

    var currentDims: any = {};
    var initialDims: any = {};
    var fullIndices: any = {};
    var inputIndices: any = {};

    var size = fullLayout._size;

    cdModule.forEach(function(d: any, i: any) {
        var trace = d[0].trace;
        fullIndices[i] = trace.index;
        var iIn = inputIndices[i] = trace.index;
        currentDims[i] = gd.data[iIn].dimensions;
        initialDims[i] = gd.data[iIn].dimensions.slice();
    });

    var filterChanged = function(i: any, initialDimIndex: any, newRanges: any) {
        var dim = initialDims[i][initialDimIndex];
        var newConstraints: any = newRanges.map(function(r: any) { return r.slice(); });

        var aStr = 'dimensions[' + initialDimIndex + '].constraintrange';
        var preGUI = fullLayout._tracePreGUI[gd._fullData[fullIndices[i]]._fullInput.uid];
        if(preGUI[aStr] === undefined) {
            var initialVal = dim.constraintrange;
            preGUI[aStr] = initialVal || null;
        }

        var fullDimension = gd._fullData[fullIndices[i]].dimensions[initialDimIndex];

        if(!newConstraints.length) {
            delete dim.constraintrange;
            delete fullDimension.constraintrange;
            newConstraints = null;
        } else {
            if(newConstraints.length === 1) newConstraints = newConstraints[0];
            dim.constraintrange = newConstraints;
            fullDimension.constraintrange = newConstraints.slice();
            newConstraints = [newConstraints];
        }

        var restyleData: any = {};
        restyleData[aStr] = newConstraints;
        gd.emit('plotly_restyle', [restyleData, [inputIndices[i]]]);
    };

    var hover = function(eventData: any) {
        gd.emit('plotly_hover', eventData);
    };

    var unhover = function(eventData: any) {
        gd.emit('plotly_unhover', eventData);
    };

    var axesMoved = function(i: any, visibleIndices: any) {
        var orig = sorter(visibleIndices, initialDims[i].filter(isVisible));
        currentDims[i].sort(orig);

        initialDims[i].filter(function(d: any) {return !isVisible(d);})
             .sort(function(d: any) {
                 return initialDims[i].indexOf(d);
             })
            .forEach(function(d: any) {
                currentDims[i].splice(currentDims[i].indexOf(d), 1);
                currentDims[i].splice(initialDims[i].indexOf(d), 0, d);
            });

        gd.emit('plotly_restyle', [{dimensions: [currentDims[i]]}, [inputIndices[i]]]);
    };

    parcoords(
        gd,
        cdModule,
        {
            width: size.w,
            height: size.h,
            margin: {
                t: size.t,
                r: size.r,
                b: size.b,
                l: size.l
            }
        },
        {
            filterChanged: filterChanged,
            hover: hover,
            unhover: unhover,
            axesMoved: axesMoved
        }
    );
}

(plot as any).reglPrecompiled = reglPrecompiled;

export { reglPrecompiled };

export default plot;
