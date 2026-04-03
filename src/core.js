import "./lib/d3-compat.js";
import "d3-transition";
import { register } from './registry.js';
import plotApi from './plot_api/index.js';
import FxModule from './components/fx/index.js';
import PlotsModule from './plots/plots.js';
import { version } from './version.js';
import 'native-promise-only';
import './plotcss.js';
import scatter from './traces/scatter/index.js';
import annotations from './components/annotations/index.js';
import annotations3d from './components/annotations3d/index.js';
import selections from './components/selections/index.js';
import shapes from './components/shapes/index.js';
import images from './components/images/index.js';
import updatemenus from './components/updatemenus/index.js';
import sliders from './components/sliders/index.js';
import rangeslider from './components/rangeslider/index.js';
import rangeselector from './components/rangeselector/index.js';
import grid from './components/grid/index.js';
import errorbars from './components/errorbars/index.js';
import colorscale from './components/colorscale/index.js';
import colorbar from './components/colorbar/index.js';
import legend from './components/legend/index.js';
import fx from './components/fx/index.js';
import modebar from './components/modebar/index.js';
import localeEn from './locale-en.js';
import localeEnUs from './locale-en-us.js';
import Icons from './fonts/ploticon.js';
import Snapshot from './snapshot/index.js';
import PlotSchema from './plot_api/plot_schema.js';
const Plotly = { version, register, Icons, Snapshot, PlotSchema };
const methodNames = Object.keys(plotApi);
for (let i = 0; i < methodNames.length; i++) {
    const name = methodNames[i];
    if (name.charAt(0) !== '_')
        Plotly[name] = plotApi[name];
    register({ moduleType: 'apiMethod', name: name, fn: plotApi[name] });
}
register(scatter);
register([annotations, annotations3d, selections, shapes, images, updatemenus, sliders, rangeslider, rangeselector, grid, errorbars, colorscale, colorbar, legend, fx, modebar]);
register([localeEn, localeEnUs]);
if (typeof window !== 'undefined' && window.PlotlyLocales && Array.isArray(window.PlotlyLocales)) {
    register(window.PlotlyLocales);
    delete window.PlotlyLocales;
}
Plotly.Plots = { resize: PlotsModule.resize, graphJson: PlotsModule.graphJson, sendDataToCloud: PlotsModule.sendDataToCloud };
Plotly.Fx = { hover: FxModule.hover, unhover: FxModule.unhover, loneHover: FxModule.loneHover, loneUnhover: FxModule.loneUnhover };
export default Plotly;
