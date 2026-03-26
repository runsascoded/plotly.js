import Plotly from './core.js';
import cone_trace from './cone.js';
import isosurface_trace from './isosurface.js';
import mesh3d_trace from './mesh3d.js';
import scatter_trace from './scatter.js';
import scatter3d_trace from './scatter3d.js';
import streamtube_trace from './streamtube.js';
import surface_trace from './surface.js';
import volume_trace from './volume.js';
import calendars from './calendars.js';

Plotly.register([cone_trace, isosurface_trace, mesh3d_trace, scatter_trace, scatter3d_trace, streamtube_trace, surface_trace, volume_trace, calendars]);

export default Plotly;
