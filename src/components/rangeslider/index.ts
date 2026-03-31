import Lib from '../../lib/index.js';
import attrs from './attributes.js';
import oppAxisAttrs from './oppaxis_attributes.js';
import helpers from './helpers.js';
import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc_autorange.js';
import _req3 from './draw.js';

export default {
    moduleType: 'component',
    name: 'rangeslider',

    schema: {
        subplots: {
            xaxis: {
                rangeslider: Lib.extendFlat({}, attrs, {
                    yaxis: oppAxisAttrs
                })
            }
        }
    },

    layoutAttributes: _req0,
    handleDefaults: _req1,
    calcAutorange: _req2,
    draw: _req3,
    isVisible: helpers.isVisible,
    makeData: helpers.makeData,
    autoMarginOpts: helpers.autoMarginOpts
};
