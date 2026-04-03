import Lib from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import axisIds from '../../plots/cartesian/axis_ids.js';
import attributes from './attributes.js';
import oppAxisAttrs from './oppaxis_attributes.js';
export default function handleDefaults(layoutIn, layoutOut, axName) {
    const axIn = layoutIn[axName];
    const axOut = layoutOut[axName];
    if (!(axIn.rangeslider || layoutOut._requestRangeslider[axOut._id]))
        return;
    // not super proud of this (maybe store _ in axis object instead
    if (!Lib.isPlainObject(axIn.rangeslider)) {
        axIn.rangeslider = {};
    }
    const containerIn = axIn.rangeslider;
    const containerOut = Template.newContainer(axOut, 'rangeslider');
    function coerce(attr, dflt) {
        return Lib.coerce(containerIn, containerOut, attributes, attr, dflt);
    }
    let rangeContainerIn, rangeContainerOut;
    function coerceRange(attr, dflt) {
        return Lib.coerce(rangeContainerIn, rangeContainerOut, oppAxisAttrs, attr, dflt);
    }
    const visible = coerce('visible');
    if (!visible)
        return;
    coerce('bgcolor', layoutOut.plot_bgcolor);
    coerce('bordercolor');
    coerce('borderwidth');
    coerce('thickness');
    coerce('autorange', !axOut.isValidRange(containerIn.range));
    coerce('range');
    const subplots = layoutOut._subplots;
    if (subplots) {
        const yIds = subplots.cartesian
            .filter((subplotId) => subplotId.slice(0, Math.max(0, subplotId.indexOf('y'))) === axisIds.name2id(axName))
            .map((subplotId) => subplotId.slice(subplotId.indexOf('y'), subplotId.length));
        const yNames = Lib.simpleMap(yIds, axisIds.id2name);
        for (let i = 0; i < yNames.length; i++) {
            const yName = yNames[i];
            rangeContainerIn = containerIn[yName] || {};
            rangeContainerOut = Template.newContainer(containerOut, yName, 'yaxis');
            const yAxOut = layoutOut[yName];
            let rangemodeDflt;
            if (rangeContainerIn.range && yAxOut.isValidRange(rangeContainerIn.range)) {
                rangemodeDflt = 'fixed';
            }
            const rangeMode = coerceRange('rangemode', rangemodeDflt);
            if (rangeMode !== 'match') {
                coerceRange('range', yAxOut.range.slice());
            }
        }
    }
    // to map back range slider (auto) range
    containerOut._input = containerIn;
}
