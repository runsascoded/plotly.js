import isNumeric from 'fast-isnumeric';
import { dateTime2ms, incrementMonth } from '../../lib/index.js';
import constants from '../../constants/numerical.js';
const ONEAVGMONTH = constants.ONEAVGMONTH;

export default function alignPeriod(trace?: any, ax?: any, axLetter?: any, vals?: any): any {
    if(ax.type !== 'date') return {vals: vals};

    const alignment = trace[axLetter + 'periodalignment'];
    if(!alignment) return {vals: vals};

    let period = trace[axLetter + 'period'];
    let mPeriod;
    if(isNumeric(period)) {
        period = +period;
        if(period <= 0) return {vals: vals};
    } else if(typeof period === 'string' && period.charAt(0) === 'M') {
        const n = +(period.substring(1));
        if(n > 0 && Math.round(n) === n) {
            mPeriod = n;
        } else return {vals: vals};
    }

    const calendar = ax.calendar;

    const isStart = 'start' === alignment;
    // const isMiddle = 'middle' === alignment;
    const isEnd = 'end' === alignment;

    const period0 = trace[axLetter + 'period0'];
    const base = dateTime2ms(period0, calendar) || 0;

    const newVals: any[] = [];
    const starts: any[] = [];
    const ends: any[] = [];

    const len = vals.length;
    for(let i = 0; i < len; i++) {
        const v = vals[i];

        let nEstimated, startTime, endTime;
        if(mPeriod) {
            // guess at how many periods away from base we are
            nEstimated = Math.round((v - base) / (mPeriod * ONEAVGMONTH));
            endTime = incrementMonth(base, mPeriod * nEstimated, calendar);

            // iterate to get the exact bounds before and after v
            // there may be ways to make this faster, but most of the time
            // we'll only execute each loop zero or one time.
            while(endTime > v) {
                endTime = incrementMonth(endTime, -mPeriod, calendar);
            }
            while(endTime <= v) {
                endTime = incrementMonth(endTime, mPeriod, calendar);
            }

            // now we know endTime is the boundary immediately after v
            // so startTime is obtained by incrementing backward one period.
            startTime = incrementMonth(endTime, -mPeriod, calendar);
        } else { // case of ms
            nEstimated = Math.round((v - base) / period);
            endTime = base + nEstimated * period;

            while(endTime > v) {
                endTime -= period;
            }
            while(endTime <= v) {
                endTime += period;
            }

            startTime = endTime - period;
        }

        newVals[i] = (
            isStart ? startTime :
            isEnd ? endTime :
            (startTime + endTime) / 2
        ) as any;

        starts[i] = (startTime as any);
        ends[i] = (endTime as any);
    }

    return {
        vals: newVals,
        starts: starts,
        ends: ends
    };
}
