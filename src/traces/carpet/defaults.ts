import Lib from '../../lib/index.js';
import handleXYDefaults from './xy_defaults.js';
import handleABDefaults from './ab_defaults.js';
import attributes from './attributes.js';
import colorAttrs from '../../components/color/attributes.js';

export default function supplyDefaults(traceIn, traceOut, dfltColor, fullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    traceOut._clipPathId = 'clip' + traceOut.uid + 'carpet';

    var defaultColor = coerce('color', colorAttrs.defaultLine);
    Lib.coerceFont(coerce, 'font', fullLayout.font);

    coerce('carpet');

    handleABDefaults(traceIn, traceOut, fullLayout, coerce, defaultColor);

    if(!traceOut.a || !traceOut.b) {
        traceOut.visible = false;
        return;
    }

    if(traceOut.a.length < 3) {
        traceOut.aaxis.smoothing = 0;
    }

    if(traceOut.b.length < 3) {
        traceOut.baxis.smoothing = 0;
    }

    // NB: the input is x/y arrays. You should know that the *first* dimension of x and y
    // corresponds to b and the second to a. This sounds backwards but ends up making sense
    // the important part to know is that when you write y[j][i], j goes from 0 to b.length - 1
    // and i goes from 0 to a.length - 1.
    var validData = handleXYDefaults(traceIn, traceOut, coerce);
    if(!validData) {
        traceOut.visible = false;
    }

    if(traceOut._cheater) {
        coerce('cheaterslope');
    }
    coerce('zorder');
}
