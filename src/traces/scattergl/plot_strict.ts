import plot from './plot.js';
import reglPrecompiled from './regl_precompiled.js';

Object.assign((plot as any).reglPrecompiled, reglPrecompiled);

export default plot;
