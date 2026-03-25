import scatterPolarFormatLabels from '../scatterpolar/format_labels.js';

export default function formatLabels(cdi, trace, fullLayout) {
    var i = cdi.i;
    if(!('r' in cdi)) cdi.r = trace._r[i];
    if(!('theta' in cdi)) cdi.theta = trace._theta[i];
    return scatterPolarFormatLabels(cdi, trace, fullLayout);
}
