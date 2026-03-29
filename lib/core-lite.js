import "../src/lib/d3-compat.js";
import "d3-transition";
import Registry from '../src/registry.js';
import plotApi from '../src/plot_api/index.js';
import FxModule from '../src/components/fx/index.js';
import PlotsModule from '../src/plots/plots.js';
import { version } from '../src/version.js';
import 'native-promise-only';
import '../src/plotcss.js';
import scatter from '../src/traces/scatter/index.js';
import shapes from '../src/components/shapes/index.js';
import errorbars from '../src/components/errorbars/index.js';
import colorscale from '../src/components/colorscale/index.js';
import legend from '../src/components/legend/index.js';
import fx from '../src/components/fx/index.js';
import modebar from '../src/components/modebar/index.js';
import localeEn from '../src/locale-en.js';
import localeEnUs from '../src/locale-en-us.js';
import Icons from '../src/fonts/ploticon.js';
import Snapshot from '../src/snapshot/index.js';
import PlotSchema from '../src/plot_api/plot_schema.js';
var register = Registry.register;
var Plotly = { version, register, Icons, Snapshot, PlotSchema };
var methodNames = Object.keys(plotApi);
for(var i = 0; i < methodNames.length; i++) {
    var name = methodNames[i];
    if(name.charAt(0) !== '_') Plotly[name] = plotApi[name];
    register({ moduleType: 'apiMethod', name: name, fn: plotApi[name] });
}
register(scatter);
register([shapes, errorbars, colorscale, legend, fx, modebar]);
register([localeEn, localeEnUs]);
if(typeof window !== 'undefined' && window.PlotlyLocales && Array.isArray(window.PlotlyLocales)) {
    register(window.PlotlyLocales);
    delete window.PlotlyLocales;
}
Plotly.Plots = { resize: PlotsModule.resize, graphJson: PlotsModule.graphJson, sendDataToCloud: PlotsModule.sendDataToCloud };
Plotly.Fx = { hover: FxModule.hover, unhover: FxModule.unhover, loneHover: FxModule.loneHover, loneUnhover: FxModule.loneUnhover };
export default Plotly;
