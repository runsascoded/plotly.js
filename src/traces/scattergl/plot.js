import createScatter from 'regl-scatter2d';
import createLine from 'regl-line2d';
import createError from 'regl-error2d';
import Text from 'gl-text';
import Lib from '../../lib/index.js';
import { selectMode } from '../../components/dragelement/helpers.js';
import prepareRegl from '../../lib/prepare_regl.js';
import subTypes from '../scatter/subtypes.js';
import linkTraces from '../scatter/link_traces.js';
import _edit_style from './edit_style.js';
const { styleTextSelection } = _edit_style;

var reglPrecompiled = {};

function getViewport(fullLayout, xaxis, yaxis, plotGlPixelRatio) {
    var gs = fullLayout._size;
    var width = fullLayout.width * plotGlPixelRatio;
    var height = fullLayout.height * plotGlPixelRatio;

    var l = gs.l * plotGlPixelRatio;
    var b = gs.b * plotGlPixelRatio;
    var r = gs.r * plotGlPixelRatio;
    var t = gs.t * plotGlPixelRatio;
    var w = gs.w * plotGlPixelRatio;
    var h = gs.h * plotGlPixelRatio;
    return [
        l + xaxis.domain[0] * w,
        b + yaxis.domain[0] * h,
        (width - r) - (1 - xaxis.domain[1]) * w,
        (height - t) - (1 - yaxis.domain[1]) * h
    ];
}

var exports = {};

export { reglPrecompiled };

export default { reglPrecompiled };
