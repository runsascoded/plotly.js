import drawModule from './draw.js';
import clickModule from './click.js';
import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../../plots/cartesian/include_components.js';
import _req3 from './calc_autorange.js';
import _req4 from './convert_coords.js';

export default {
    moduleType: 'component',
    name: 'annotations',

    layoutAttributes: _req0,
    supplyLayoutDefaults: _req1,
    includeBasePlot: _req2('annotations'),

    calcAutorange: _req3,
    draw: drawModule.draw,
    drawOne: drawModule.drawOne,
    drawRaw: drawModule.drawRaw,

    hasClickToShow: clickModule.hasClickToShow,
    onClick: clickModule.onClick,

    convertCoords: _req4
};
