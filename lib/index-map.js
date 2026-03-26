import Plotly from './core.js';
import choroplethmap_trace from './choroplethmap.js';
import densitymap_trace from './densitymap.js';
import scatter_trace from './scatter.js';
import scattermap_trace from './scattermap.js';
import calendars from './calendars.js';

Plotly.register([choroplethmap_trace, densitymap_trace, scatter_trace, scattermap_trace, calendars]);

export default Plotly;
