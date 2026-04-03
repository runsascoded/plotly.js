import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../../plots/cartesian/include_components.js';
import _req3 from './draw.js';
import _req4 from './convert_coords.js';
export default {
    moduleType: 'component',
    name: 'images',
    layoutAttributes: _req0,
    supplyLayoutDefaults: _req1,
    includeBasePlot: _req2('images'),
    draw: _req3,
    convertCoords: _req4
};
