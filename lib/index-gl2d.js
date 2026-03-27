import Plotly from './core.js';
import parcoords from './parcoords.js';
import scatter from './scatter.js';
import scattergl from './scattergl.js';
import splom from './splom.js';
import calendars from './calendars.js';

Plotly.register([parcoords, scatter, scattergl, splom, calendars]);

export default Plotly;
