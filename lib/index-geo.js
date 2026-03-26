import Plotly from './core.js';
import choropleth_trace from './choropleth.js';
import scatter_trace from './scatter.js';
import scattergeo_trace from './scattergeo.js';
import calendars from './calendars.js';

Plotly.register([choropleth_trace, scatter_trace, scattergeo_trace, calendars]);

export default Plotly;
