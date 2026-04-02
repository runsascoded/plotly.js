import type { GraphDiv } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import toLogRange from '../../lib/to_log_range.js';

export default function convertCoords(gd: GraphDiv, ax: any, newType: any, doExtra: any) {
    ax = ax || {};

    const toLog = (newType === 'log') && (ax.type === 'linear');
    const fromLog = (newType === 'linear') && (ax.type === 'log');

    if(!(toLog || fromLog)) return;

    const annotations = gd._fullLayout.annotations;
    const axLetter = ax._id.charAt(0);
    let ann;
    let attrPrefix;

    function convert(attr: any) {
        const currentVal = ann[attr];
        let newVal = null;

        if(toLog) newVal = (toLogRange(currentVal, ax.range) as any);
        else newVal = (Math.pow(10, currentVal) as any);

        // if conversion failed, delete the value so it gets a default value
        if(!isNumeric(newVal)) newVal = null;

        doExtra(attrPrefix + attr, newVal);
    }

    for(let i = 0; i < annotations!.length; i++) {
        ann = annotations![i];
        attrPrefix = 'annotations[' + i + '].';

        if(ann[axLetter + 'ref'] === ax._id) convert(axLetter);
        if(ann['a' + axLetter + 'ref'] === ax._id) convert('a' + axLetter);
    }
}
