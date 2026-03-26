import Plotly from './core.js';
import heatmapgl_trace from './heatmapgl.js';
import parcoords_trace from './parcoords.js';
import pointcloud_trace from './pointcloud.js';
import scatter_trace from './scatter.js';
import scattergl_trace from './scattergl.js';
import splom_trace from './splom.js';
import calendars from './calendars.js';

Plotly.register([heatmapgl_trace, parcoords_trace, pointcloud_trace, scatter_trace, scattergl_trace, splom_trace, calendars]);

export default Plotly;
