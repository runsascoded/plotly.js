import isNumeric from 'fast-isnumeric';
import { cleanDate, dateTick0 } from '../../lib/index.js';
import constants from '../../constants/numerical.js';
const ONEDAY = constants.ONEDAY;
const ONEWEEK = constants.ONEWEEK;

export function dtick(dtick?: any, axType?: any): any {
    const isLog = axType === 'log';
    const isDate = axType === 'date';
    const isCat = axType === 'category';
    const dtickDflt = isDate ? ONEDAY : 1;

    if(!dtick) return dtickDflt;

    if(isNumeric(dtick)) {
        dtick = Number(dtick);
        if(dtick <= 0) return dtickDflt;
        if(isCat) {
            // category dtick must be positive integers
            return Math.max(1, Math.round(dtick));
        }
        if(isDate) {
            // date dtick must be at least 0.1ms (our current precision)
            return Math.max(0.1, dtick);
        }
        return dtick;
    }

    if(typeof dtick !== 'string' || !(isDate || isLog)) {
        return dtickDflt;
    }

    const prefix = dtick.charAt(0);
    let dtickNum: any = dtick.slice(1);
    dtickNum = isNumeric(dtickNum) ? Number(dtickNum) : 0;

    if((dtickNum <= 0) || !(
            // "M<n>" gives ticks every (integer) n months
            (// "D1" gives powers of 10 with all small digits between, "D2" gives only 2 and 5
            (isDate && prefix === 'M' && dtickNum === Math.round(dtickNum)) ||
            // "L<f>" gives ticks linearly spaced in data (not in position) every (float) f
            (isLog && prefix === 'L') || (isLog && prefix === 'D' && (dtickNum === 1 || dtickNum === 2)))
        )) {
        return dtickDflt;
    }

    return dtick;
}

export function tick0(tick0?: any, axType?: any, calendar?: any, dtick?: any): any {
    if(axType === 'date') {
        return cleanDate(tick0,
            dateTick0(calendar, (dtick % ONEWEEK === 0) ? 1 : 0)
        );
    }
    if(dtick === 'D1' || dtick === 'D2') {
        // D1 and D2 modes ignore tick0 entirely
        return undefined;
    }
    // Aside from date axes, tick0 must be numeric
    return isNumeric(tick0) ? Number(tick0) : 0;
}

export default { dtick, tick0 };
