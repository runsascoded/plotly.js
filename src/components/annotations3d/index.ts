import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import type { FullLayout } from '../../../types/core';
import _req0 from './attributes.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import _req3 from './convert.js';
import _req4 from './draw.js';

export default {
    moduleType: 'component',
    name: 'annotations3d',

    schema: {
        subplots: {
            scene: {annotations: _req0}
        }
    },

    layoutAttributes: _req1,
    handleDefaults: _req2,
    includeBasePlot: includeGL3D,

    convert: _req3,
    draw: _req4
};

function includeGL3D(layoutIn: any, layoutOut: FullLayout) {
    const GL3D = Registry.subplotsRegistry.gl3d;
    if(!GL3D) return;

    const attrRegex = GL3D.attrRegex;

    const keys = Object.keys(layoutIn);
    for(let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if(attrRegex.test(k) && (layoutIn[k].annotations || []).length) {
            Lib.pushUnique(layoutOut._basePlotModules, GL3D);
            Lib.pushUnique(layoutOut._subplots.gl3d, k);
        }
    }
}
