import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import { dateTick0 } from '../../lib/index.js';
import numConstants from '../../constants/numerical.js';
var ONEWEEK = numConstants.ONEWEEK;

function getPeriod0Dflt(period: any, calendar: any): any {
    if(period % ONEWEEK === 0) {
        return dateTick0(calendar, 1); // Sunday
    }
    return dateTick0(calendar, 0);
}

export default function handlePeriodDefaults(traceIn: InputTrace, traceOut: FullTrace, layout: FullLayout, coerce: any, opts?: any): void {
    if(!opts) {
        opts = {
            x: true,
            y: true
        };
    }

    if(opts.x) {
        var xperiod = coerce('xperiod');
        if(xperiod) {
            coerce('xperiod0', getPeriod0Dflt(xperiod, traceOut.xcalendar));
            coerce('xperiodalignment');
        }
    }

    if(opts.y) {
        var yperiod = coerce('yperiod');
        if(yperiod) {
            coerce('yperiod0', getPeriod0Dflt(yperiod, traceOut.ycalendar));
            coerce('yperiodalignment');
        }
    }
}
