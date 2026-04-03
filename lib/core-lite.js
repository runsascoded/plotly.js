import "../src/lib/d3-compat";
import "d3-transition";
import Registry from '../src/registry';
import plotApi from '../src/plot_api/index';
import FxModule from '../src/components/fx/index';
import PlotsModule from '../src/plots/plots';
import { version } from '../src/version';
import 'native-promise-only';
import '../src/plotcss';
import scatter from '../src/traces/scatter/index';
import shapes from '../src/components/shapes/index';
import errorbars from '../src/components/errorbars/index';
import colorscale from '../src/components/colorscale/index';
import legend from '../src/components/legend/index';
import fx from '../src/components/fx/index';
import modebar from '../src/components/modebar/index';
import localeEn from '../src/locale-en';
import localeEnUs from '../src/locale-en-us';
import Icons from '../src/fonts/ploticon';
import Snapshot from '../src/snapshot/index';
import PlotSchema from '../src/plot_api/plot_schema';
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
