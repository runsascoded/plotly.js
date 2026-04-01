import plot from './plot.js';
import reglPrecompiled from './regl_precompiled.js';
import reglPrecompiledDep from '../scattergl/regl_precompiled.js';

Object.assign((plot as any).reglPrecompiled, reglPrecompiled);

Object.assign((plot as any).reglPrecompiled, reglPrecompiledDep);

export default plot;
