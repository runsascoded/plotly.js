import _gup from '../../lib/gup.js';
const { wrap } = _gup;
export default function calc() {
    // we don't actually need to include the trace here, since that will be added
    // by Plots.doCalcdata, and that's all we actually need later.
    return wrap({});
}
