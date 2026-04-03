import plot from './plot.js';
import reglPrecompiled from './regl_precompiled.js';
import reglPrecompiledDep from '../scattergl/regl_precompiled.js';
Object.assign(plot.reglPrecompiled, reglPrecompiled);
Object.assign(plot.reglPrecompiled, reglPrecompiledDep);
export default plot;
