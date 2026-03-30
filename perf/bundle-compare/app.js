/**
 * Minimal plotly.js app for bundle size comparison.
 * Renders a scatter plot and a bar chart — the two most common trace types.
 */
import Plotly from 'plotly.js';

const el = document.createElement('div');
document.body.appendChild(el);

Plotly.newPlot(el, [
    { x: [1, 2, 3, 4], y: [10, 15, 13, 17], type: 'scatter', name: 'Line' },
    { x: [1, 2, 3, 4], y: [16, 5, 11, 9], type: 'bar', name: 'Bar' },
], {
    title: 'Bundle size test',
    width: 800,
    height: 400,
});
