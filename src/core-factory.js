/**
 * Tree-shakeable plotly.js factory.
 *
 * Instead of registering all components at import time (which forces
 * the bundler to include everything), consumers import only what they
 * need and pass it to createPlotly():
 *
 *   import { createPlotly } from 'plotly.js/core';
 *   import scatter from 'plotly.js/traces/scatter';
 *   import bar from 'plotly.js/traces/bar';
 *   import legend from 'plotly.js/components/legend';
 *
 *   const Plotly = createPlotly({
 *       traces: [scatter, bar],
 *       components: [legend],
 *   });
 *   Plotly.newPlot(el, data, layout);
 */
import './lib/d3-compat.js';
import 'd3-transition';
import 'native-promise-only';
import Registry from './registry.js';
// Import plot_api.js directly (not index.js) to avoid pulling in
// to_image, validate, template_api, snapshot/download
import main from './plot_api/plot_api.js';
import FxModule from './components/fx/index.js';
import { resize, graphJson, sendDataToCloud } from './plots/plots.js';
import { version } from './version.js';
import './plotcss.js';

// Essential components that every plot needs (always registered)
import colorscale from './components/colorscale/index.js';
import fx from './components/fx/index.js';

import localeEn from './locale-en.js';
import localeEnUs from './locale-en-us.js';

// API methods needed for runtime (excludes toImage, validate, etc.)
var apiMethodNames = [
    'newPlot', 'react', 'restyle', 'relayout', 'redraw', 'update',
    'extendTraces', 'prependTraces', 'addTraces', 'deleteTraces', 'moveTraces',
    'purge', 'addFrames', 'deleteFrames', 'animate', 'setPlotConfig',
    '_doPlot', '_guiRestyle', '_guiRelayout', '_guiUpdate', '_storeDirectGUIEdit',
];

export function createPlotly({ traces = [], components = [], Icons, Snapshot, PlotSchema } = {}) {
    var register = Registry.register;
    var Plotly = { version, register };
    if(Icons) Plotly.Icons = Icons;
    if(Snapshot) Plotly.Snapshot = Snapshot;
    if(PlotSchema) Plotly.PlotSchema = PlotSchema;

    // Register API methods
    for(var i = 0; i < apiMethodNames.length; i++) {
        var name = apiMethodNames[i];
        if(!main[name]) continue;
        if(name.charAt(0) !== '_') Plotly[name] = main[name];
        register({ moduleType: 'apiMethod', name: name, fn: main[name] });
    }

    // Register essential components (always needed)
    register([colorscale, fx]);

    // Register user-chosen traces and components
    for(var t = 0; t < traces.length; t++) register(traces[t]);
    for(var c = 0; c < components.length; c++) register(components[c]);

    // Register locales
    register([localeEn, localeEnUs]);
    if(typeof window !== 'undefined' && window.PlotlyLocales && Array.isArray(window.PlotlyLocales)) {
        register(window.PlotlyLocales);
        delete window.PlotlyLocales;
    }

    Plotly.Plots = { resize, graphJson, sendDataToCloud };
    Plotly.Fx = {
        hover: FxModule.hover,
        unhover: FxModule.unhover,
        loneHover: FxModule.loneHover,
        loneUnhover: FxModule.loneUnhover,
    };

    return Plotly;
}

