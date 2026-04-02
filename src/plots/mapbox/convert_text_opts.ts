import Lib from '../../lib/index.js';

export default function convertTextOpts(textposition: any, iconSize: any) {
    const parts = textposition.split(' ');
    const vPos = parts[0];
    const hPos = parts[1];

    // ballpack values
    const factor = Lib.isArrayOrTypedArray(iconSize) ? Lib.mean(iconSize) : iconSize;
    const xInc = 0.5 + (factor / 100);
    const yInc = 1.5 + (factor / 100);

    const anchorVals = ['', ''];
    const offset = [0, 0];

    switch(vPos) {
        case 'top':
            anchorVals[0] = 'top';
            offset[1] = -yInc;
            break;
        case 'bottom':
            anchorVals[0] = 'bottom';
            offset[1] = yInc;
            break;
    }

    switch(hPos) {
        case 'left':
            anchorVals[1] = 'right';
            offset[0] = -xInc;
            break;
        case 'right':
            anchorVals[1] = 'left';
            offset[0] = xInc;
            break;
    }

    // Mapbox text-anchor must be one of:
    //  center, left, right, top, bottom,
    //  top-left, top-right, bottom-left, bottom-right

    let anchor;
    if(anchorVals[0] && anchorVals[1]) anchor = anchorVals.join('-');
    else if(anchorVals[0]) anchor = anchorVals[0];
    else if(anchorVals[1]) anchor = anchorVals[1];
    else anchor = 'center';

    return { anchor: anchor, offset: offset };
}
