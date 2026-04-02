import parcoords from './parcoords.js';
import prepareRegl from '../../lib/prepare_regl.js';
import { isVisible } from './helpers.js';
import type { GraphDiv } from '../../../types/core';
const reglPrecompiled: any = {};

function newIndex(visibleIndices: any, orig: any, dim: any) {
    const origIndex = orig.indexOf(dim);
    let currentIndex = visibleIndices.indexOf(origIndex);
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
    const fullLayout = gd._fullLayout;

    const success = prepareRegl(gd, [], reglPrecompiled);
    if(!success) return;

    const currentDims: any = {};
    const initialDims: any = {};
    const fullIndices: any = {};
    const inputIndices: any = {};

    const size = fullLayout._size;

    cdModule.forEach((d: any, i: any) => {
        const trace = d[0].trace;
        fullIndices[i] = trace.index;
        const iIn = inputIndices[i] = trace.index;
        currentDims[i] = gd.data[iIn].dimensions;
        initialDims[i] = gd.data[iIn].dimensions.slice();
    });

    const filterChanged = function(i: any, initialDimIndex: any, newRanges: any) {
        const dim = initialDims[i][initialDimIndex];
        let newConstraints: any = newRanges.map((r: any) => r.slice());

        const aStr = 'dimensions[' + initialDimIndex + '].constraintrange';
        const preGUI = fullLayout._tracePreGUI[gd._fullData[fullIndices[i]]._fullInput.uid];
        if(preGUI[aStr] === undefined) {
            const initialVal = dim.constraintrange;
            preGUI[aStr] = initialVal || null;
        }

        const fullDimension = gd._fullData[fullIndices[i]].dimensions[initialDimIndex];

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

        const restyleData: any = {};
        restyleData[aStr] = newConstraints;
        gd.emit('plotly_restyle', [restyleData, [inputIndices[i]]]);
    };

    const hover = function(eventData: any) {
        gd.emit('plotly_hover', eventData);
    };

    const unhover = function(eventData: any) {
        gd.emit('plotly_unhover', eventData);
    };

    const axesMoved = function(i: any, visibleIndices: any) {
        const orig = sorter(visibleIndices, initialDims[i].filter(isVisible));
        currentDims[i].sort(orig);

        initialDims[i].filter((d: any) => !isVisible(d))
             .sort((d: any) => initialDims[i].indexOf(d))
            .forEach((d: any) => {
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
