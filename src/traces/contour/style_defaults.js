import colorscaleDefaults from '../../components/colorscale/defaults.js';
import handleLabelDefaults from './label_defaults.js';
export default function handleStyleDefaults(traceIn, traceOut, coerce, layout, opts) {
    const coloring = coerce('contours.coloring');
    let showLines;
    let lineColor = '';
    if (coloring === 'fill')
        showLines = coerce('contours.showlines');
    if (showLines !== false) {
        if (coloring !== 'lines')
            lineColor = coerce('line.color', '#000');
        coerce('line.width', 0.5);
        coerce('line.dash');
    }
    if (coloring !== 'none') {
        // plots/plots always coerces showlegend to true, but in this case
        // we default to false and (by default) show a colorbar instead
        if (traceIn.showlegend !== true)
            traceOut.showlegend = false;
        traceOut._dfltShowLegend = false;
        colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'z' });
    }
    coerce('line.smoothing');
    handleLabelDefaults(coerce, layout, lineColor, opts);
}
