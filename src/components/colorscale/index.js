import scales from './scales.js';
import helpers from './helpers.js';
import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import _req2 from './layout_defaults.js';
import _req3 from './defaults.js';
import _req4 from './cross_trace_defaults.js';
import _req5 from './calc.js';
export default {
    moduleType: 'component',
    name: 'colorscale',
    attributes: _req0,
    layoutAttributes: _req1,
    supplyLayoutDefaults: _req2,
    handleDefaults: _req3,
    crossTraceDefaults: _req4,
    calc: _req5,
    // ./scales.js is required in lib/coerce.js ;
    // it needs to be a separate module to avoid a circular dependency
    scales: scales.scales,
    defaultScale: scales.defaultScale,
    getScale: scales.get,
    isValidScale: scales.isValid,
    hasColorscale: helpers.hasColorscale,
    extractOpts: helpers.extractOpts,
    extractScale: helpers.extractScale,
    flipScale: helpers.flipScale,
    makeColorScaleFunc: helpers.makeColorScaleFunc,
    makeColorScaleFuncFromTrace: helpers.makeColorScaleFuncFromTrace
};
