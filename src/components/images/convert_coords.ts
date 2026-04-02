import type { GraphDiv } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import toLogRange from '../../lib/to_log_range.js';

export default function convertCoords(gd: GraphDiv, ax: any, newType: any, doExtra: any) {
    ax = ax || {};

    const toLog = (newType === 'log') && (ax.type === 'linear');
    const fromLog = (newType === 'linear') && (ax.type === 'log');

    if(!(toLog || fromLog)) return;

    const images = gd._fullLayout.images;
    const axLetter = ax._id.charAt(0);
    let image;
    let attrPrefix;

    for(let i = 0; i < images!.length; i++) {
        image = images![i];
        attrPrefix = 'images[' + i + '].';

        if(image[axLetter + 'ref'] === ax._id) {
            const currentPos = image[axLetter];
            const currentSize = image['size' + axLetter];
            let newPos = null;
            let newSize = null;

            if(toLog) {
                newPos = (toLogRange(currentPos, ax.range) as any);

                // this is the inverse of the conversion we do in fromLog below
                // so that the conversion is reversible (notice the fromLog conversion
                // is like sinh, and this one looks like arcsinh)
                const dx = currentSize / Math.pow(10, newPos!) / 2;
                newSize = (2 * Math.log(dx + Math.sqrt(1 + dx * dx)) / Math.LN10 as any);
            } else {
                newPos = (Math.pow(10, currentPos) as any);
                newSize = (newPos! * (Math.pow(10, currentSize / 2) - Math.pow(10, -currentSize / 2)) as any);
            }

            // if conversion failed, delete the value so it can get a default later on
            if(!isNumeric(newPos)) {
                newPos = null;
                newSize = null;
            } else if(!isNumeric(newSize)) newSize = null;

            doExtra(attrPrefix + axLetter, newPos);
            doExtra(attrPrefix + 'size' + axLetter, newSize);
        }
    }
}
