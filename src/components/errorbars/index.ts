import Lib from '../../lib/index.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import attributes from './attributes.js';
import _req0 from './defaults.js';
import _req1 from './calc.js';
import _req2 from './compute_error.js';
import _req3 from './plot.js';
import _req4 from './style.js';

var xyAttrs: Record<string, any> = {
    error_x: Lib.extendFlat({}, attributes),
    error_y: Lib.extendFlat({}, attributes)
};
delete xyAttrs.error_x.copy_zstyle;
delete xyAttrs.error_y.copy_zstyle;
delete xyAttrs.error_y.copy_ystyle;

var xyzAttrs: Record<string, any> = {
    error_x: Lib.extendFlat({}, attributes),
    error_y: Lib.extendFlat({}, attributes),
    error_z: Lib.extendFlat({}, attributes)
};
delete xyzAttrs.error_x.copy_ystyle;
delete xyzAttrs.error_y.copy_ystyle;
delete xyzAttrs.error_z.copy_ystyle;
delete xyzAttrs.error_z.copy_zstyle;

export default {
    moduleType: 'component',
    name: 'errorbars',

    schema: {
        traces: {
            scatter: xyAttrs,
            bar: xyAttrs,
            histogram: xyAttrs,
            scatter3d: overrideAll(xyzAttrs, 'calc', 'nested'),
            scattergl: overrideAll(xyAttrs, 'calc', 'nested')
        }
    },

    supplyDefaults: _req0,

    calc: _req1,
    makeComputeError: _req2,

    plot: _req3,
    style: _req4,
    hoverInfo: hoverInfo
};

function hoverInfo(calcPoint: any, trace: any, hoverPoint: any): void {
    if((trace.error_y || {}).visible) {
        hoverPoint.yerr = calcPoint.yh - calcPoint.y;
        if(!trace.error_y.symmetric) hoverPoint.yerrneg = calcPoint.y - calcPoint.ys;
    }
    if((trace.error_x || {}).visible) {
        hoverPoint.xerr = calcPoint.xh - calcPoint.x;
        if(!trace.error_x.symmetric) hoverPoint.xerrneg = calcPoint.x - calcPoint.xs;
    }
}
