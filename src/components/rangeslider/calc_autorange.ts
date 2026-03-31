import { list as listAxes } from '../../plots/cartesian/axis_ids.js';
import _autorange from '../../plots/cartesian/autorange.js';
const { getAutoRange } = _autorange;
import constants from './constants.js';

export default function calcAutorange(gd: any) {
    var axes = listAxes(gd, 'x', true);

    // Compute new slider range using axis autorange if necessary.
    //
    // Copy back range to input range slider container to skip
    // this step in subsequent draw calls.

    for(var i = 0; i < axes.length; i++) {
        var ax = axes[i];
        var opts = ax[constants.name];

        if(opts && opts.visible && opts.autorange) {
            opts._input.autorange = true;
            opts._input.range = opts.range = getAutoRange(gd, ax);
        }
    }
}
