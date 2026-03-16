'use strict';

/**
 * Lite core: only the components needed for basic cartesian plots with
 * legend, hover, and modebar. Skips annotations, selections, images,
 * updatemenus, sliders, rangeslider, rangeselector, grid, and colorbar.
 *
 * Saves bundle size and supplyDefaults time by not registering unused
 * component modules.
 */

exports.version = require('../src/version').version;

require('native-promise-only');
require('../build/plotcss');

var Registry = require('../src/registry');
var register = exports.register = Registry.register;

var plotApi = require('../src/plot_api');
var methodNames = Object.keys(plotApi);
for(var i = 0; i < methodNames.length; i++) {
    var name = methodNames[i];
    if(name.charAt(0) !== '_') exports[name] = plotApi[name];
    register({
        moduleType: 'apiMethod',
        name: name,
        fn: plotApi[name]
    });
}

// scatter is included by default
register(require('../src/traces/scatter'));

// Only the components we actually need:
// shapes must come before legend (legend defaults depend on shapes)
register([
    require('../src/components/shapes'),
    require('../src/components/errorbars'),
    require('../src/components/colorscale'),
    require('../src/components/legend'),
    require('../src/components/fx'),
    require('../src/components/modebar'),
]);

register([
    require('../src/locale-en'),
    require('../src/locale-en-us'),
]);

if(typeof window !== 'undefined' && window.PlotlyLocales && Array.isArray(window.PlotlyLocales)) {
    register(window.PlotlyLocales);
    delete window.PlotlyLocales;
}

exports.Icons = require('../src/fonts/ploticon');

var Fx = require('../src/components/fx');
var Plots = require('../src/plots/plots');

exports.Plots = {
    resize: Plots.resize,
    graphJson: Plots.graphJson,
    sendDataToCloud: Plots.sendDataToCloud
};
exports.Fx = {
    hover: Fx.hover,
    unhover: Fx.unhover,
    loneHover: Fx.loneHover,
    loneUnhover: Fx.loneUnhover
};
exports.Snapshot = require('../src/snapshot');
exports.PlotSchema = require('../src/plot_api/plot_schema');
