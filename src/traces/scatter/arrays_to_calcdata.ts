import { mergeArray, mergeArrayCastPositive } from '../../lib/index.js';

export default function arraysToCalcdata(cd: any[], trace: any): void {
    // so each point knows which index it originally came from
    for(var i = 0; i < cd.length; i++) cd[i].i = i;

    mergeArray(trace.text, cd, 'tx');
    mergeArray(trace.texttemplate, cd, 'txt');
    mergeArray(trace.hovertext, cd, 'htx');
    mergeArray(trace.customdata, cd, 'data');
    mergeArray(trace.textposition, cd, 'tp');
    if(trace.textfont) {
        mergeArrayCastPositive(trace.textfont.size, cd, 'ts');
        mergeArray(trace.textfont.color, cd, 'tc');
        mergeArray(trace.textfont.family, cd, 'tf');
        mergeArray(trace.textfont.weight, cd, 'tw');
        mergeArray(trace.textfont.style, cd, 'ty');
        mergeArray(trace.textfont.variant, cd, 'tv');
        mergeArray(trace.textfont.textcase, cd, 'tC');
        mergeArray(trace.textfont.lineposition, cd, 'tE');
        mergeArray(trace.textfont.shadow, cd, 'tS');
    }

    var marker = trace.marker;
    if(marker) {
        mergeArrayCastPositive(marker.size, cd, 'ms');
        mergeArrayCastPositive(marker.opacity, cd, 'mo');
        mergeArray(marker.symbol, cd, 'mx');
        mergeArray(marker.angle, cd, 'ma');
        mergeArray(marker.standoff, cd, 'mf');
        mergeArray(marker.color, cd, 'mc');

        var markerLine = marker.line;
        if(marker.line) {
            mergeArray(markerLine.color, cd, 'mlc');
            mergeArrayCastPositive(markerLine.width, cd, 'mlw');
        }

        var markerGradient = marker.gradient;
        if(markerGradient && markerGradient.type !== 'none') {
            mergeArray(markerGradient.type, cd, 'mgt');
            mergeArray(markerGradient.color, cd, 'mgc');
        }
    }
}
