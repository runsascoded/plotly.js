import parcoords from './parcoords.js';
import prepareRegl from '../../lib/prepare_regl.js';
import { isVisible } from './helpers.js';
const reglPrecompiled = {};
function newIndex(visibleIndices, orig, dim) {
    const origIndex = orig.indexOf(dim);
    let currentIndex = visibleIndices.indexOf(origIndex);
    if (currentIndex === -1) {
        currentIndex += orig.length;
    }
    return currentIndex;
}
function sorter(visibleIndices, orig) {
    return function sorter(d1, d2) {
        return (newIndex(visibleIndices, orig, d1) -
            newIndex(visibleIndices, orig, d2));
    };
}
function plot(gd, cdModule) {
    const fullLayout = gd._fullLayout;
    const success = prepareRegl(gd, [], reglPrecompiled);
    if (!success)
        return;
    const currentDims = {};
    const initialDims = {};
    const fullIndices = {};
    const inputIndices = {};
    const size = fullLayout._size;
    cdModule.forEach((d, i) => {
        const trace = d[0].trace;
        fullIndices[i] = trace.index;
        const iIn = inputIndices[i] = trace.index;
        currentDims[i] = gd.data[iIn].dimensions;
        initialDims[i] = gd.data[iIn].dimensions.slice();
    });
    const filterChanged = (i, initialDimIndex, newRanges) => {
        const dim = initialDims[i][initialDimIndex];
        let newConstraints = newRanges.map((r) => r.slice());
        const aStr = 'dimensions[' + initialDimIndex + '].constraintrange';
        const preGUI = fullLayout._tracePreGUI[gd._fullData[fullIndices[i]]._fullInput.uid];
        if (preGUI[aStr] === undefined) {
            const initialVal = dim.constraintrange;
            preGUI[aStr] = initialVal || null;
        }
        const fullDimension = gd._fullData[fullIndices[i]].dimensions[initialDimIndex];
        if (!newConstraints.length) {
            delete dim.constraintrange;
            delete fullDimension.constraintrange;
            newConstraints = null;
        }
        else {
            if (newConstraints.length === 1)
                newConstraints = newConstraints[0];
            dim.constraintrange = newConstraints;
            fullDimension.constraintrange = newConstraints.slice();
            newConstraints = [newConstraints];
        }
        const restyleData = {};
        restyleData[aStr] = newConstraints;
        gd.emit('plotly_restyle', [restyleData, [inputIndices[i]]]);
    };
    const hover = (eventData) => {
        gd.emit('plotly_hover', eventData);
    };
    const unhover = (eventData) => {
        gd.emit('plotly_unhover', eventData);
    };
    const axesMoved = (i, visibleIndices) => {
        const orig = sorter(visibleIndices, initialDims[i].filter(isVisible));
        currentDims[i].sort(orig);
        initialDims[i].filter((d) => !isVisible(d))
            .sort((d) => initialDims[i].indexOf(d))
            .forEach((d) => {
            currentDims[i].splice(currentDims[i].indexOf(d), 1);
            currentDims[i].splice(initialDims[i].indexOf(d), 0, d);
        });
        gd.emit('plotly_restyle', [{ dimensions: [currentDims[i]] }, [inputIndices[i]]]);
    };
    parcoords(gd, cdModule, {
        width: size.w,
        height: size.h,
        margin: {
            t: size.t,
            r: size.r,
            b: size.b,
            l: size.l
        }
    }, {
        filterChanged: filterChanged,
        hover: hover,
        unhover: unhover,
        axesMoved: axesMoved
    });
}
plot.reglPrecompiled = reglPrecompiled;
export { reglPrecompiled };
export default plot;
