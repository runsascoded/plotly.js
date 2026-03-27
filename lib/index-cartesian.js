import Plotly from './core.js';
import bar_trace from './bar.js';
import box_trace from './box.js';
import contour_trace from './contour.js';
import heatmap_trace from './heatmap.js';
import histogram_trace from './histogram.js';
import histogram2d_trace from './histogram2d.js';
import histogram2dcontour_trace from './histogram2dcontour.js';
import image_trace from './image.js';
import pie_trace from './pie.js';
import scatter_trace from './scatter.js';
import scatterternary_trace from './scatterternary.js';
import violin_trace from './violin.js';
import calendars from './calendars.js';

Plotly.register([bar_trace, box_trace, contour_trace, heatmap_trace, histogram_trace, histogram2d_trace, histogram2dcontour_trace, image_trace, pie_trace, scatter_trace, scatterternary_trace, violin_trace, calendars]);

export default Plotly;
