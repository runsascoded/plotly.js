import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import _defaults from '../bar/defaults.js';
const { handleText } = _defaults;
import _defaults2 from '../pie/defaults.js';
const { handleLabelsAndValues, handleMarkerDefaults } = _defaults2;
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
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
    handleMarkerDefaults(traceIn, traceOut, layout, coerce);
    coerce('scalegroup');
    const textData = coerce('text');
    const textTemplate = coerce('texttemplate');
    coerce('texttemplatefallback');
    let textInfo;
    if (!textTemplate)
        textInfo = coerce('textinfo', Array.isArray(textData) ? 'text+percent' : 'percent');
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
    }
    else if (textInfo === 'none') {
        coerce('textposition', 'none');
    }
    handleDomainDefaults(traceOut, layout, coerce);
    const title = coerce('title.text');
    if (title) {
        coerce('title.position');
        Lib.coerceFont(coerce, 'title.font', layout.font);
    }
    coerce('aspectratio');
    coerce('baseratio');
}
