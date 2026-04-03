import Lib from '../../lib/index.js';
export default function arraysToCalcdata(cd, trace) {
    for (let i = 0; i < cd.length; i++)
        cd[i].i = i;
    Lib.mergeArray(trace.text, cd, 'tx');
    Lib.mergeArray(trace.hovertext, cd, 'htx');
    const marker = trace.marker;
    if (marker) {
        Lib.mergeArray(marker.opacity, cd, 'mo');
        Lib.mergeArray(marker.color, cd, 'mc');
        const markerLine = marker.line;
        if (markerLine) {
            Lib.mergeArray(markerLine.color, cd, 'mlc');
            Lib.mergeArrayCastPositive(markerLine.width, cd, 'mlw');
        }
    }
}
