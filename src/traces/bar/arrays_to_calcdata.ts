import { mergeArray, mergeArrayCastPositive } from '../../lib/index.js';

export default function arraysToCalcdata(cd: any[], trace: any): void {
    for(var i = 0; i < cd.length; i++) cd[i].i = i;

    mergeArray(trace.text, cd, 'tx');
    mergeArray(trace.hovertext, cd, 'htx');

    var marker = trace.marker;
    if(marker) {
        (mergeArray as any)(marker.opacity, cd, 'mo', true);
        mergeArray(marker.color, cd, 'mc');

        var markerLine = marker.line;
        if(markerLine) {
            mergeArray(markerLine.color, cd, 'mlc');
            mergeArrayCastPositive(markerLine.width, cd, 'mlw');
        }
    }
}
