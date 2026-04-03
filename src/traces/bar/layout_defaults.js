import { traceIs } from '../../lib/trace_categories.js';
import Axes from '../../plots/cartesian/axes.js';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
import _defaults from './defaults.js';
const { validateCornerradius } = _defaults;
export default function (layoutIn, layoutOut, fullData) {
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    let hasBars = false;
    let shouldBeGapless = false;
    let gappedAnyway = false;
    const usedSubplots = {};
    const mode = coerce('barmode');
    const isGroup = mode === 'group';
    for (let i = 0; i < fullData.length; i++) {
        const trace = fullData[i];
        if (traceIs(trace, 'bar') && trace.visible)
            hasBars = true;
        else
            continue;
        // if we have at least 2 grouped bar traces on the same subplot,
        // we should default to a gap anyway, even if the data is histograms
        let subploti = trace.xaxis + trace.yaxis;
        if (isGroup) {
            // with barmode group, bars are grouped next to each other when sharing the same axes
            if (usedSubplots[subploti])
                gappedAnyway = true;
            usedSubplots[subploti] = true;
        }
        else {
            // with other barmodes bars are grouped next to each other when sharing the same axes
            // and using different offsetgroups
            subploti += trace._input.offsetgroup;
            if (usedSubplots.length > 0 && !usedSubplots[subploti])
                gappedAnyway = true;
            usedSubplots[subploti] = true;
        }
        if (trace.visible && trace.type === 'histogram') {
            const pa = Axes.getFromId({ _fullLayout: layoutOut }, trace[trace.orientation === 'v' ? 'xaxis' : 'yaxis']);
            if (pa.type !== 'category')
                shouldBeGapless = true;
        }
    }
    if (!hasBars) {
        delete layoutOut.barmode;
        return;
    }
    if (mode !== 'overlay')
        coerce('barnorm');
    coerce('bargap', (shouldBeGapless && !gappedAnyway) ? 0 : 0.2);
    coerce('bargroupgap');
    const r = coerce('barcornerradius');
    layoutOut.barcornerradius = validateCornerradius(r);
}
