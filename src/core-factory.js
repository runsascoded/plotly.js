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
import plotApi from './plot_api/index.js';
import FxModule from './components/fx/index.js';
import PlotsModule from './plots/plots.js';
import { version } from './version.js';
import './plotcss.js';

// Essential components that every plot needs (always registered)
import colorscale from './components/colorscale/index.js';
import fx from './components/fx/index.js';
import modebar from './components/modebar/index.js';

import localeEn from './locale-en.js';
import localeEnUs from './locale-en-us.js';
import Icons from './fonts/ploticon.js';
import Snapshot from './snapshot/index.js';
import PlotSchema from './plot_api/plot_schema.js';

export function createPlotly({ traces = [], components = [] } = {}) {
    var register = Registry.register;
    var Plotly = { version, register, Icons, Snapshot, PlotSchema };

    // Register API methods
    var methodNames = Object.keys(plotApi);
    for(var i = 0; i < methodNames.length; i++) {
        var name = methodNames[i];
        if(name.charAt(0) !== '_') Plotly[name] = plotApi[name];
        register({ moduleType: 'apiMethod', name: name, fn: plotApi[name] });
    }

    // Register essential components (always needed)
    register([colorscale, fx, modebar]);

    // Register user-chosen traces and components
    for(var t = 0; t < traces.length; t++) register(traces[t]);
    for(var c = 0; c < components.length; c++) register(components[c]);

    // Register locales
    register([localeEn, localeEnUs]);
    if(typeof window !== 'undefined' && window.PlotlyLocales && Array.isArray(window.PlotlyLocales)) {
        register(window.PlotlyLocales);
        delete window.PlotlyLocales;
    }

    Plotly.Plots = {
        resize: PlotsModule.resize,
        graphJson: PlotsModule.graphJson,
        sendDataToCloud: PlotsModule.sendDataToCloud,
    };
    Plotly.Fx = {
        hover: FxModule.hover,
        unhover: FxModule.unhover,
        loneHover: FxModule.loneHover,
        loneUnhover: FxModule.loneUnhover,
    };

    return Plotly;
}

