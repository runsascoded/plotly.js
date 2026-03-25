import Lib from '../../lib/index.js';
import handleGroupingDefaults from '../scatter/grouping_defaults.js';
import _defaults from '../bar/defaults.js';
const { handleText } = _defaults;
import handleXYDefaults from '../scatter/xy_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import attributes from './attributes.js';
import Color from '../../components/color/index.js';

function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    var len = handleXYDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    coerce('orientation', traceOut.y && !traceOut.x ? 'v' : 'h');
    coerce('offset');
    coerce('width');

    var text = coerce('text');

    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    var textposition = coerce('textposition');
    handleText(traceIn, traceOut, layout, coerce, textposition, {
        moduleHasSelected: false,
        moduleHasUnselected: false,
        moduleHasConstrain: true,
        moduleHasCliponaxis: true,
        moduleHasTextangle: true,
        moduleHasInsideanchor: true
    });

    if (traceOut.textposition !== 'none' && !traceOut.texttemplate) {
        coerce('textinfo', Lib.isArrayOrTypedArray(text) ? 'text+value' : 'value');
    }

    var markerColor = coerce('marker.color', defaultColor);
    coerce('marker.line.color', Color.defaultLine);
    coerce('marker.line.width');

    var connectorVisible = coerce('connector.visible');
    if (connectorVisible) {
        coerce('connector.fillcolor', defaultFillColor(markerColor));

        var connectorLineWidth = coerce('connector.line.width');
        if (connectorLineWidth) {
            coerce('connector.line.color');
            coerce('connector.line.dash');
        }
    }
    coerce('zorder');
}

function defaultFillColor(markerColor) {
    var cBase = Lib.isArrayOrTypedArray(markerColor) ? '#000' : markerColor;

    return Color.addOpacity(cBase, 0.5 * Color.opacity(cBase));
}

function crossTraceDefaults(fullData, fullLayout) {
    var traceIn, traceOut;

    function coerce(attr) {
        return Lib.coerce(traceOut._input, traceOut, attributes, attr);
    }

    for (var i = 0; i < fullData.length; i++) {
        traceOut = fullData[i];
        if (traceOut.type === 'funnel') {
            traceIn = traceOut._input;
            handleGroupingDefaults(traceIn, traceOut, fullLayout, coerce, fullLayout.funnelmode);
        }
    }
}

export default {
    supplyDefaults: supplyDefaults,
    crossTraceDefaults: crossTraceDefaults
};
