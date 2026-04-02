import type { GraphDiv } from '../../../types/core';
import Lib from '../../lib/index.js';
import calcColorscale from '../scatter/colorscale_calc.js';
import _convert from '../scattergl/convert.js';
const { markerStyle: convertMarkerStyle } = _convert;

export default function editStyle(gd: GraphDiv, cd0: any) {
    const trace = cd0.trace;
    const scene = gd._fullLayout._splomScenes[trace.uid];

    if(scene) {
        calcColorscale(gd, trace);

        Lib.extendFlat(scene.matrixOptions, convertMarkerStyle(gd, trace));
        // TODO [un]selected styles?

        const opts = Lib.extendFlat({}, scene.matrixOptions, scene.viewOpts);

        // TODO this is too long for arrayOk attributes!
        scene.matrix.update(opts, null);
    }
}
