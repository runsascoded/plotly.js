import drawModule from './draw.js';
import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './draw_newshape/defaults.js';
import _req3 from '../../plots/cartesian/include_components.js';
import _req4 from './calc_autorange.js';
export default {
    moduleType: 'component',
    name: 'shapes',
    layoutAttributes: _req0,
    supplyLayoutDefaults: _req1,
    supplyDrawNewShapeDefaults: _req2,
    includeBasePlot: _req3('shapes'),
    calcAutorange: _req4,
    draw: drawModule.draw,
    drawOne: drawModule.drawOne,
    eraseActiveShape: drawModule.eraseActiveShape
};
