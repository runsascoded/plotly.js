import Lib from '../../lib/index.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
import subTypes from '../scatter/subtypes.js';
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import mergeLength from '../parcoords/merge_length.js';
import { isOpenSymbol } from '../scattergl/helpers.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const dimensions = handleArrayContainerDefaults(traceIn, traceOut, {
        name: 'dimensions',
        handleItemDefaults: dimensionDefaults
    });
    const showDiag = coerce('diagonal.visible');
    const showUpper = coerce('showupperhalf');
    const showLower = coerce('showlowerhalf');
    const dimLength = mergeLength(traceOut, dimensions, 'values');
    if (!dimLength || (!showDiag && !showUpper && !showLower)) {
        traceOut.visible = false;
        return;
    }
    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('xhoverformat');
    coerce('yhoverformat');
    handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { noAngleRef: true, noStandOff: true });
    const isOpen = isOpenSymbol(traceOut.marker.symbol);
    const isBubble = subTypes.isBubble(traceOut);
    coerce('marker.line.width', isOpen || isBubble ? 1 : 0);
    handleAxisDefaults(traceIn, traceOut, layout, coerce);
    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
function dimensionDefaults(dimIn, dimOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(dimIn, dimOut, attributes.dimensions, attr, dflt);
    }
    coerce('label');
    const values = coerce('values');
    if (!(values && values.length))
        dimOut.visible = false;
    else
        coerce('visible');
    coerce('axis.type');
    coerce('axis.matches');
}
function handleAxisDefaults(traceIn, traceOut, layout, coerce) {
    const dimensions = traceOut.dimensions;
    const dimLength = dimensions.length;
    const showUpper = traceOut.showupperhalf;
    const showLower = traceOut.showlowerhalf;
    const showDiag = traceOut.diagonal.visible;
    let i, j;
    const xAxesDflt = new Array(dimLength);
    const yAxesDflt = new Array(dimLength);
    for (i = 0; i < dimLength; i++) {
        const suffix = i ? i + 1 : '';
        xAxesDflt[i] = 'x' + suffix;
        yAxesDflt[i] = 'y' + suffix;
    }
    const xaxes = coerce('xaxes', xAxesDflt);
    const yaxes = coerce('yaxes', yAxesDflt);
    // build list of [x,y] axis corresponding to each dimensions[i],
    // very useful for passing options to regl-splom
    const diag = (traceOut._diag = new Array(dimLength));
    // lookup for 'drawn' x|y axes, to avoid costly indexOf downstream
    traceOut._xaxes = {};
    traceOut._yaxes = {};
    // list of 'drawn' x|y axes, use to generate list of subplots
    const xList = [];
    const yList = [];
    function fillAxisStashes(axId, counterAxId, dim, list) {
        if (!axId)
            return;
        const axLetter = axId.charAt(0);
        const stash = layout._splomAxes[axLetter];
        traceOut['_' + axLetter + 'axes'][axId] = 1;
        list.push(axId);
        if (!(axId in stash)) {
            const s = (stash[axId] = {});
            if (dim) {
                s.label = dim.label || '';
                if (dim.visible && dim.axis) {
                    if (dim.axis.type)
                        s.type = dim.axis.type;
                    if (dim.axis.matches)
                        s.matches = counterAxId;
                }
            }
        }
    }
    // cases where showDiag and showLower or showUpper are false
    // no special treatment as the 'drawn' x-axes and y-axes no longer match
    // the dimensions items and xaxes|yaxes 1-to-1
    const mustShiftX = !showDiag && !showLower;
    const mustShiftY = !showDiag && !showUpper;
    traceOut._axesDim = {};
    for (i = 0; i < dimLength; i++) {
        const dim = dimensions[i];
        const i0 = i === 0;
        const iN = i === dimLength - 1;
        const xaId = (i0 && mustShiftX) || (iN && mustShiftY) ? undefined : xaxes[i];
        const yaId = (i0 && mustShiftY) || (iN && mustShiftX) ? undefined : yaxes[i];
        fillAxisStashes(xaId, yaId, dim, xList);
        fillAxisStashes(yaId, xaId, dim, yList);
        diag[i] = [xaId, yaId];
        traceOut._axesDim[xaId] = i;
        traceOut._axesDim[yaId] = i;
    }
    // fill in splom subplot keys
    for (i = 0; i < xList.length; i++) {
        for (j = 0; j < yList.length; j++) {
            const id = xList[i] + yList[j];
            if (i > j && showUpper) {
                layout._splomSubplots[id] = 1;
            }
            else if (i < j && showLower) {
                layout._splomSubplots[id] = 1;
            }
            else if (i === j && (showDiag || !showLower || !showUpper)) {
                // need to include diagonal subplots when
                // hiding one half and the diagonal
                layout._splomSubplots[id] = 1;
            }
        }
    }
    // when lower half is omitted, or when just the diagonal is gone,
    // override grid default to make sure axes remain on
    // the left/bottom of the plot area
    if (!showLower || (!showDiag && showUpper && showLower)) {
        layout._splomGridDflt.xside = 'bottom';
        layout._splomGridDflt.yside = 'left';
    }
}
