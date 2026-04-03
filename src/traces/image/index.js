import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
import _req3 from './plot.js';
import _req4 from './style.js';
import _req5 from './hover.js';
import _req6 from './event_data.js';
import _req7 from '../../plots/cartesian/index.js';
export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    plot: _req3,
    style: _req4,
    hoverPoints: _req5,
    eventData: _req6,
    moduleType: 'trace',
    name: 'image',
    basePlotModule: _req7,
    categories: ['cartesian', 'svg', '2dMap', 'noSortingByValue'],
    animatable: false,
    meta: {
        description: [
            'Display an image, i.e. data on a 2D regular raster.',
            'By default, when an image is displayed in a subplot,',
            'its y axis will be reversed (ie. `autorange: \'reversed\'`),',
            'constrained to the domain (ie. `constrain: \'domain\'`)',
            'and it will have the same scale as its x axis (ie. `scaleanchor: \'x\,`)',
            'in order for pixels to be rendered as squares.'
        ].join(' ')
    }
};
