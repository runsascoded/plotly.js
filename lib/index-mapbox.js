import Plotly from './core.js';
import choroplethmapbox_trace from './choroplethmapbox.js';
import densitymapbox_trace from './densitymapbox.js';
import scatter_trace from './scatter.js';
import scattermapbox_trace from './scattermapbox.js';
import calendars from './calendars.js';

Plotly.register([choroplethmapbox_trace, densitymapbox_trace, scatter_trace, scattermapbox_trace, calendars]);

export default Plotly;
