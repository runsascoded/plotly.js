/**
 * Factory-based app for bundle size comparison.
 * Uses createPlotly() with only scatter + bar + legend.
 */
import { createPlotly } from '../../src/core-factory.js';
import scatter from '../../src/traces/scatter/index.js';
import bar from '../../src/traces/bar/index.js';
import legend from '../../src/components/legend/index.js';

var Plotly = createPlotly({
    traces: [scatter, bar],
    components: [legend],
});

var el = document.createElement('div');
document.body.appendChild(el);

Plotly.newPlot(el, [
    { x: [1, 2, 3, 4], y: [10, 15, 13, 17], type: 'scatter', name: 'Line' },
    { x: [1, 2, 3, 4], y: [16, 5, 11, 9], type: 'bar', name: 'Bar' },
], {
    title: 'Bundle size test (factory)',
    width: 800,
    height: 400,
});
