import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _draw from './draw.js';
const { draw: _req2 } = _draw;
import _req3 from './has_colorbar.js';

export default {
    moduleType: 'component',
    name: 'colorbar',

    attributes: _req0,
    supplyDefaults: _req1,

    draw: _req2,
    hasColorbar: _req3
};
