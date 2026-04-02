import helpers from './helpers.js';
import _req0 from './cloneplot.js';
import _req1 from './tosvg.js';
import _req2 from './svgtoimg.js';
import _req3 from './toimage.js';
import _req4 from './download.js';

const Snapshot = {
    getDelay: helpers.getDelay,
    getRedrawFunc: helpers.getRedrawFunc,
    clone: _req0,
    toSVG: _req1,
    svgToImg: _req2,
    toImage: _req3,
    downloadImage: _req4
};

export default Snapshot;
