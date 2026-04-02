import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import _defaults from '../bar/defaults.js';
const { handleText } = _defaults;
import _index from '../../lib/index.js';
const { coercePattern } = _index;

function handleLabelsAndValues(labels: any[], values: any[]): { hasLabels: boolean; hasValues: boolean; len: number } {
    const hasLabels = Lib.isArrayOrTypedArray(labels);
    const hasValues = Lib.isArrayOrTypedArray(values);
    let len = Math.min(hasLabels ? labels.length : Infinity, hasValues ? values.length : Infinity);

    if (!isFinite(len)) len = 0;

    if (len && hasValues) {
        let hasPositive;
        for (let i = 0; i < len; i++) {
            const v = values[i];
            if (isNumeric(v) && v > 0) {
                hasPositive = true;
                break;
            }
        }
        if (!hasPositive) len = 0;
    }

    return {
        hasLabels: hasLabels,
        hasValues: hasValues,
        len: len
    };
}

function handleMarkerDefaults(traceIn: InputTrace, traceOut: FullTrace, layout: FullLayout, coerce: Function, isPie: boolean): void {
    const lineWidth = coerce('marker.line.width');
    if (lineWidth) {
        coerce(
            'marker.line.color',
            isPie ? undefined : layout.paper_bgcolor // case of funnelarea, sunburst, icicle, treemap
        );
    }

    const markerColors = coerce('marker.colors');
    coercePattern(coerce, 'marker.pattern', markerColors);
    // push the marker colors (with s) to the foreground colors, to work around logic in the drawing pattern code on marker.color (without s, which is okay for a bar trace)
    if (traceIn.marker && !traceOut.marker.pattern.fgcolor) traceOut.marker.pattern.fgcolor = traceIn.marker.colors;
    if (!traceOut.marker.pattern.bgcolor) traceOut.marker.pattern.bgcolor = layout.paper_bgcolor;
}

function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const labels = coerce('labels');
    const values = coerce('values');

    const res = handleLabelsAndValues(labels, values);
    const len = res.len;
    traceOut._hasLabels = res.hasLabels;
    traceOut._hasValues = res.hasValues;

    if (!traceOut._hasLabels && traceOut._hasValues) {
        coerce('label0');
        coerce('dlabel');
    }

    if (!len) {
        traceOut.visible = false;
        return;
    }
    traceOut._length = len;

    handleMarkerDefaults(traceIn, traceOut, layout, coerce, true);

    coerce('scalegroup');
    // TODO: hole needs to be coerced to the same value within a scaleegroup

    const textData = coerce('text');
    const textTemplate = coerce('texttemplate');
    coerce('texttemplatefallback');
    let textInfo;
    if (!textTemplate) textInfo = coerce('textinfo', Lib.isArrayOrTypedArray(textData) ? 'text+percent' : 'percent');

    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    if (textTemplate || (textInfo && textInfo !== 'none')) {
        const textposition = coerce('textposition');
        handleText(traceIn, traceOut, layout, coerce, textposition, {
            moduleHasSelected: false,
            moduleHasUnselected: false,
            moduleHasConstrain: false,
            moduleHasCliponaxis: false,
            moduleHasTextangle: false,
            moduleHasInsideanchor: false
        });

        const hasBoth = Array.isArray(textposition) || textposition === 'auto';
        const hasOutside = hasBoth || textposition === 'outside';
        if (hasOutside) {
            coerce('automargin');
        }

        if (textposition === 'inside' || textposition === 'auto' || Array.isArray(textposition)) {
            coerce('insidetextorientation');
        }
    } else if (textInfo === 'none') {
        coerce('textposition', 'none');
    }

    handleDomainDefaults(traceOut, layout, coerce);

    const hole = coerce('hole');
    const title = coerce('title.text');
    if (title) {
        const titlePosition = coerce('title.position', hole ? 'middle center' : 'top center');
        if (!hole && titlePosition === 'middle center') traceOut.title.position = 'top center';
        Lib.coerceFont(coerce, 'title.font', layout.font);
    }

    coerce('sort');
    coerce('direction');
    coerce('rotation');
    coerce('pull');
}

export default {
    handleLabelsAndValues: handleLabelsAndValues,
    handleMarkerDefaults: handleMarkerDefaults,
    supplyDefaults: supplyDefaults
};
