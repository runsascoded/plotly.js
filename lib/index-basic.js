import Plotly from './core.js';
import bar from './bar.js';
import pie from './pie.js';
import calendars from './calendars.js';

Plotly.register([bar, pie, calendars]);

export default Plotly;
