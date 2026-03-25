import _req0 from './attributes.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import _req3 from './draw.js';

export default {
    moduleType: 'component',
    name: 'rangeselector',

    schema: {
        subplots: {
            xaxis: {rangeselector: _req0}
        }
    },

    layoutAttributes: _req1,
    handleDefaults: _req2,

    draw: _req3
};
