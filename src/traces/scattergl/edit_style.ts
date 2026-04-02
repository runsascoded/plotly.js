import type { CalcDatum } from '../../../types/core';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import _interactions from '../../constants/interactions.js';
const { DESELECTDIM } = _interactions;

function styleTextSelection(cd: CalcDatum[]) {
    const cd0 = cd[0];
    const trace = cd0.trace;
    const stash = cd0.t;
    const scene = stash._scene;
    const index = stash.index;
    const els = scene.selectBatch[index];
    const unels = scene.unselectBatch[index];
    const baseOpts = scene.textOptions[index];
    const selOpts = scene.textSelectedOptions[index] || {};
    const unselOpts = scene.textUnselectedOptions[index] || {};
    const opts = Lib.extendFlat({}, baseOpts);
    let i, j;

    if(els.length || unels.length) {
        const stc = selOpts.color;
        const utc = unselOpts.color;
        const base = baseOpts.color;
        const hasArrayBase = Lib.isArrayOrTypedArray(base);
        opts.color = new Array(trace._length);

        for(i = 0; i < els.length; i++) {
            j = els[i];
            opts.color[j] = stc || (hasArrayBase ? base[j] : base);
        }
        for(i = 0; i < unels.length; i++) {
            j = unels[i];
            const basej = hasArrayBase ? base[j] : base;
            opts.color[j] = utc ? utc :
                stc ? basej : Color.addOpacity(basej, DESELECTDIM);
        }
    }

    scene.glText[index].update(opts);
}

export default {
    styleTextSelection: styleTextSelection
};
