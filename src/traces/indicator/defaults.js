import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import Template from '../../plot_api/plot_template.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import cn from './constants.js';
import handleTickValueDefaults from '../../plots/cartesian/tick_value_defaults.js';
import handleTickMarkDefaults from '../../plots/cartesian/tick_mark_defaults.js';
import handleTickLabelDefaults from '../../plots/cartesian/tick_label_defaults.js';
import handlePrefixSuffixDefaults from '../../plots/cartesian/prefix_suffix_defaults.js';
function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    handleDomainDefaults(traceOut, layout, coerce);
    // Mode
    coerce('mode');
    traceOut._hasNumber = traceOut.mode.indexOf('number') !== -1;
    traceOut._hasDelta = traceOut.mode.indexOf('delta') !== -1;
    traceOut._hasGauge = traceOut.mode.indexOf('gauge') !== -1;
    const value = coerce('value');
    traceOut._range = [0, (typeof value === 'number' ? 1.5 * value : 1)];
    // Number attributes
    const auto = new Array(2);
    let bignumberFontSize;
    if (traceOut._hasNumber) {
        coerce('number.valueformat');
        const numberFontDflt = Lib.extendFlat({}, layout.font);
        numberFontDflt.size = undefined;
        Lib.coerceFont(coerce, 'number.font', numberFontDflt);
        if (traceOut.number.font.size === undefined) {
            traceOut.number.font.size = cn.defaultNumberFontSize;
            auto[0] = true;
        }
        coerce('number.prefix');
        coerce('number.suffix');
        bignumberFontSize = traceOut.number.font.size;
    }
    // delta attributes
    let deltaFontSize;
    if (traceOut._hasDelta) {
        const deltaFontDflt = Lib.extendFlat({}, layout.font);
        deltaFontDflt.size = undefined;
        Lib.coerceFont(coerce, 'delta.font', deltaFontDflt);
        if (traceOut.delta.font.size === undefined) {
            traceOut.delta.font.size = (traceOut._hasNumber ? 0.5 : 1) * (bignumberFontSize || cn.defaultNumberFontSize);
            auto[1] = true;
        }
        coerce('delta.reference', traceOut.value);
        coerce('delta.relative');
        coerce('delta.valueformat', traceOut.delta.relative ? '2%' : '');
        coerce('delta.increasing.symbol');
        coerce('delta.increasing.color');
        coerce('delta.decreasing.symbol');
        coerce('delta.decreasing.color');
        coerce('delta.position');
        coerce('delta.prefix');
        coerce('delta.suffix');
        deltaFontSize = traceOut.delta.font.size;
    }
    traceOut._scaleNumbers = (!traceOut._hasNumber || auto[0]) && (!traceOut._hasDelta || auto[1]) || false;
    // Title attributes
    const titleFontDflt = Lib.extendFlat({}, layout.font);
    titleFontDflt.size = 0.25 * (bignumberFontSize || deltaFontSize || cn.defaultNumberFontSize);
    Lib.coerceFont(coerce, 'title.font', titleFontDflt);
    coerce('title.text');
    // Gauge attributes
    let gaugeIn, gaugeOut, axisIn, axisOut;
    function coerceGauge(attr, dflt) {
        return Lib.coerce(gaugeIn, gaugeOut, attributes.gauge, attr, dflt);
    }
    function coerceGaugeAxis(attr, dflt) {
        return Lib.coerce(axisIn, axisOut, attributes.gauge.axis, attr, dflt);
    }
    if (traceOut._hasGauge) {
        gaugeIn = traceIn.gauge;
        if (!gaugeIn)
            gaugeIn = {};
        gaugeOut = Template.newContainer(traceOut, 'gauge');
        coerceGauge('shape');
        const isBullet = traceOut._isBullet = traceOut.gauge.shape === 'bullet';
        if (!isBullet) {
            coerce('title.align', 'center');
        }
        const isAngular = traceOut._isAngular = traceOut.gauge.shape === 'angular';
        if (!isAngular) {
            coerce('align', 'center');
        }
        // gauge background
        coerceGauge('bgcolor', layout.paper_bgcolor);
        coerceGauge('borderwidth');
        coerceGauge('bordercolor');
        // gauge bar indicator
        coerceGauge('bar.color');
        coerceGauge('bar.line.color');
        coerceGauge('bar.line.width');
        const defaultBarThickness = cn.valueThickness * (traceOut.gauge.shape === 'bullet' ? 0.5 : 1);
        coerceGauge('bar.thickness', defaultBarThickness);
        // Gauge steps
        handleArrayContainerDefaults(gaugeIn, gaugeOut, {
            name: 'steps',
            handleItemDefaults: stepDefaults
        });
        // Gauge threshold
        coerceGauge('threshold.value');
        coerceGauge('threshold.thickness');
        coerceGauge('threshold.line.width');
        coerceGauge('threshold.line.color');
        // Gauge axis
        axisIn = {};
        if (gaugeIn)
            axisIn = gaugeIn.axis || {};
        axisOut = Template.newContainer(gaugeOut, 'axis');
        coerceGaugeAxis('visible');
        traceOut._range = coerceGaugeAxis('range', traceOut._range);
        const opts = {
            font: layout.font,
            noAutotickangles: true,
            outerTicks: true,
            noTicklabelshift: true,
            noTicklabelstandoff: true
        };
        handleTickValueDefaults(axisIn, axisOut, coerceGaugeAxis, 'linear');
        handlePrefixSuffixDefaults(axisIn, axisOut, coerceGaugeAxis, 'linear', opts);
        handleTickLabelDefaults(axisIn, axisOut, coerceGaugeAxis, 'linear', opts);
        handleTickMarkDefaults(axisIn, axisOut, coerceGaugeAxis, opts);
    }
    else {
        coerce('title.align', 'center');
        coerce('align', 'center');
        traceOut._isAngular = traceOut._isBullet = false;
    }
    // disable 1D transforms
    traceOut._length = null;
}
function stepDefaults(stepIn, stepOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(stepIn, stepOut, attributes.gauge.steps, attr, dflt);
    }
    coerce('color');
    coerce('line.color');
    coerce('line.width');
    coerce('range');
    coerce('thickness');
}
export default {
    supplyDefaults: supplyDefaults
};
