import Plotly from './core.js';
import bar_trace from './bar.js';
import candlestick_trace from './candlestick.js';
import funnel_trace from './funnel.js';
import funnelarea_trace from './funnelarea.js';
import histogram_trace from './histogram.js';
import indicator_trace from './indicator.js';
import ohlc_trace from './ohlc.js';
import pie_trace from './pie.js';
import scatter_trace from './scatter.js';
import waterfall_trace from './waterfall.js';
import calendars from './calendars.js';

Plotly.register([bar_trace, candlestick_trace, funnel_trace, funnelarea_trace, histogram_trace, indicator_trace, ohlc_trace, pie_trace, scatter_trace, waterfall_trace, calendars]);

export default Plotly;
