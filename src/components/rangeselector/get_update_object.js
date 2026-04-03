import * as d3Time from 'd3-time';
import _index from '../../lib/index.js';
const { titleCase } = _index;
export default function getUpdateObject(axisLayout, buttonLayout) {
    const axName = axisLayout._name;
    const update = {};
    if (buttonLayout.step === 'all') {
        update[axName + '.autorange'] = true;
    }
    else {
        const xrange = getXRange(axisLayout, buttonLayout);
        update[axName + '.range[0]'] = xrange[0];
        update[axName + '.range[1]'] = xrange[1];
    }
    return update;
}
function getXRange(axisLayout, buttonLayout) {
    const currentRange = axisLayout.range;
    const base = new Date(axisLayout.r2l(currentRange[1]));
    const step = buttonLayout.step;
    const utcStep = d3Time['utc' + titleCase(step)];
    const count = buttonLayout.count;
    let range0;
    switch (buttonLayout.stepmode) {
        case 'backward':
            range0 = axisLayout.l2r(+utcStep.offset(base, -count));
            break;
        case 'todate':
            const base2 = utcStep.offset(base, -count);
            range0 = axisLayout.l2r(+utcStep.ceil(base2));
            break;
    }
    const range1 = currentRange[1];
    return [range0, range1];
}
