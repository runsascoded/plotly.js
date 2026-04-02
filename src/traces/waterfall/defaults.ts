import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import handleGroupingDefaults from '../scatter/grouping_defaults.js';
import _defaults from '../bar/defaults.js';
const { handleText } = _defaults;
import handleXYDefaults from '../scatter/xy_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import attributes from './attributes.js';
import Color from '../../components/color/index.js';
import delta from '../../constants/delta.js';

const INCREASING_COLOR = delta.INCREASING.COLOR;
const DECREASING_COLOR = delta.DECREASING.COLOR;
const TOTALS_COLOR = '#4499FF';

function handleDirection(coerce,  direction,  defaultColor: string) {
    coerce(direction + '.marker.color', defaultColor);
    coerce(direction + '.marker.line.color', Color.defaultLine);
    coerce(direction + '.marker.line.width');
}

function supplyDefaults(traceIn: InputTrace,  traceOut: FullTrace,  defaultColor: string,  layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const len = handleXYDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    coerce('measure');

    coerce('orientation', traceOut.x && !traceOut.y ? 'h' : 'v');
    coerce('base');
    coerce('offset');
    coerce('width');

    coerce('text');

    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    const textposition = coerce('textposition');
    handleText(traceIn, traceOut, layout, coerce, textposition, {
        moduleHasSelected: false,
        moduleHasUnselected: false,
        moduleHasConstrain: true,
        moduleHasCliponaxis: true,
        moduleHasTextangle: true,
        moduleHasInsideanchor: true
    });

    if (traceOut.textposition !== 'none') {
        coerce('texttemplate');
        coerce('texttemplatefallback');
        if (!traceOut.texttemplate) coerce('textinfo');
    }

    handleDirection(coerce, 'increasing', INCREASING_COLOR);
    handleDirection(coerce, 'decreasing', DECREASING_COLOR);
    handleDirection(coerce, 'totals', TOTALS_COLOR);

    const connectorVisible = coerce('connector.visible');
    if (connectorVisible) {
        coerce('connector.mode');
        const connectorLineWidth = coerce('connector.line.width');
        if (connectorLineWidth) {
            coerce('connector.line.color');
            coerce('connector.line.dash');
        }
    }
    coerce('zorder');
}

function crossTraceDefaults(fullData,  fullLayout: FullLayout) {
    let traceIn, traceOut;

    function coerce(attr: string) {
        return Lib.coerce(traceOut._input, traceOut, attributes, attr);
    }
    if (fullLayout.waterfallmode === 'group') {
        for (let i = 0; i < fullData.length; i++) {
            traceOut = fullData[i];
            traceIn = traceOut._input;

            handleGroupingDefaults(traceIn, traceOut, fullLayout, coerce, fullLayout.waterfallmode);
        }
    }
}

export default {
    supplyDefaults: supplyDefaults,
    crossTraceDefaults: crossTraceDefaults
};
