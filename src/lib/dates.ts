import { timeFormat } from 'd3-time-format';
import isNumeric from 'fast-isnumeric';
import Loggers from './loggers.js';
import _mod from './mod.js';
const { mod } = _mod;
import constants from '../constants/numerical.js';
import { componentsRegistry, getComponentMethod } from '../registry.js';
import { utcFormat } from 'd3-time-format';
const BADNUM: number = (constants.BADNUM as any);
const ONEDAY: number = constants.ONEDAY;
const ONEHOUR: number = constants.ONEHOUR;
const ONEMIN: number = constants.ONEMIN;
const ONESEC: number = constants.ONESEC;
const EPOCHJD: number = constants.EPOCHJD;

const DATETIME_REGEXP = /^\s*(-?\d\d\d\d|\d\d)(-(\d?\d)(-(\d?\d)([ Tt]([01]?\d|2[0-3])(:([0-5]\d)(:([0-5]\d(\.\d+)?))?(Z|z|[+\-]\d\d(:?\d\d)?)?)?)?)?)?\s*$/m;
// special regex for chinese calendars to support yyyy-mmi-dd etc for intercalary months
const DATETIME_REGEXP_CN = /^\s*(-?\d\d\d\d|\d\d)(-(\d?\di?)(-(\d?\d)([ Tt]([01]?\d|2[0-3])(:([0-5]\d)(:([0-5]\d(\.\d+)?))?(Z|z|[+\-]\d\d(:?\d\d)?)?)?)?)?)?\s*$/m;

// for 2-digit years, the first year we map them onto
const YFIRST: number = new Date().getFullYear() - 70;

function isWorldCalendar(calendar: any): boolean {
    return (
        calendar &&
        componentsRegistry.calendars &&
        typeof calendar === 'string' && calendar !== 'gregorian'
    );
}

export function dateTick0(calendar: any, dayOfWeek: number): any {
    const tick0 = _dateTick0(calendar, !!dayOfWeek);
    if(dayOfWeek < 2) return tick0;

    let v = dateTime2ms(tick0, calendar);
    v += ONEDAY * (dayOfWeek - 1); // shift Sunday to Monday, etc.
    return ms2DateTime(v, 0, calendar);
}

/*
 * _dateTick0: get the canonical tick for this calendar
 *
 * bool sunday is for week ticks, shift it to a Sunday.
 */
function _dateTick0(calendar: any, sunday: boolean): string {
    if(isWorldCalendar(calendar)) {
        return sunday ?
            getComponentMethod('calendars', 'CANONICAL_SUNDAY')[calendar] :
            getComponentMethod('calendars', 'CANONICAL_TICK')[calendar];
    } else {
        return sunday ? '2000-01-02' : '2000-01-01';
    }
}

export function dfltRange(calendar: any): string[] {
    if(isWorldCalendar(calendar)) {
        return getComponentMethod('calendars', 'DFLTRANGE')[calendar];
    } else {
        return ['2000-01-01', '2001-01-01'];
    }
}

export function isJSDate(v: any): boolean {
    return typeof v === 'object' && v !== null && typeof v.getTime === 'function';
}

// The absolute limits of our date-time system
// This is a little weird: we use MIN_MS and MAX_MS in dateTime2ms
// but we use dateTime2ms to calculate them (after defining it!)
let MIN_MS: number, MAX_MS: number;

export function dateTime2ms(s: any, calendar?: any): number {
    // first check if s is a date object
    if(isJSDate(s)) {
        // Convert to the UTC milliseconds that give the same
        // hours as this date has in the local timezone
        let tzOffset = s.getTimezoneOffset() * ONEMIN;
        const offsetTweak = (s.getUTCMinutes() - s.getMinutes()) * ONEMIN +
            (s.getUTCSeconds() - s.getSeconds()) * ONESEC +
            (s.getUTCMilliseconds() - s.getMilliseconds());

        if(offsetTweak) {
            const comb = 3 * ONEMIN;
            tzOffset = tzOffset - comb / 2 + mod(offsetTweak - tzOffset + comb / 2, comb);
        }
        s = Number(s) - tzOffset;
        if(s >= MIN_MS && s <= MAX_MS) return s;
        return BADNUM;
    }
    // otherwise only accept strings and numbers
    if(typeof s !== 'string' && typeof s !== 'number') return BADNUM;

    s = String(s);

    const isWorld = isWorldCalendar(calendar);

    // to handle out-of-range dates in international calendars, accept
    // 'G' as a prefix to force the built-in gregorian calendar.
    const s0 = s.charAt(0);
    if(isWorld && (s0 === 'G' || s0 === 'g')) {
        s = s.slice(1);
        calendar = '';
    }

    const isChinese = isWorld && calendar.slice(0, 7) === 'chinese';

    const match = s.match(isChinese ? DATETIME_REGEXP_CN : DATETIME_REGEXP);
    if(!match) return BADNUM;
    let y: any = match[1];
    let m: any = match[3] || '1';
    const d = Number(match[5] || 1);
    const H = Number(match[7] || 0);
    const M = Number(match[9] || 0);
    const S = Number(match[11] || 0);

    if(isWorld) {
        // disallow 2-digit years for world calendars
        if(y.length === 2) return BADNUM;
        y = Number(y);

        let cDate: any;
        try {
            const calInstance = getComponentMethod('calendars', 'getCal')(calendar);
            if(isChinese) {
                const isIntercalary = m.charAt(m.length - 1) === 'i';
                m = parseInt(m, 10);
                cDate = calInstance.newDate(y, calInstance.toMonthIndex(y, m, isIntercalary), d);
            } else {
                cDate = calInstance.newDate(y, Number(m), d);
            }
        } catch(e) { return BADNUM; } // Invalid ... date

        if(!cDate) return BADNUM;

        return ((cDate.toJD() - EPOCHJD) * ONEDAY) +
            (H * ONEHOUR) + (M * ONEMIN) + (S * ONESEC);
    }

    if(y.length === 2) {
        y = (Number(y) + 2000 - YFIRST) % 100 + YFIRST;
    } else y = Number(y);

    // new Date uses months from 0; subtract 1 here just so we
    // don't have to do it again during the validity test below
    m -= 1;

    // javascript takes new Date(0..99,m,d) to mean 1900-1999, so
    // to support years 0-99 we need to use setFullYear explicitly
    // Note that 2000 is a leap year.
    const date = new Date(Date.UTC(2000, m, d, H, M));
    date.setUTCFullYear(y);

    if(date.getUTCMonth() !== m) return BADNUM;
    if(date.getUTCDate() !== d) return BADNUM;

    return date.getTime() + S * ONESEC;
}

MIN_MS = dateTime2ms('-9999');
MAX_MS = dateTime2ms('9999-12-31 23:59:59.9999');

export function isDateTime(s: any, calendar?: any): boolean {
    return (dateTime2ms(s, calendar) !== BADNUM);
}

// pad a number with zeroes, to given # of digits before the decimal point
function lpad(val: number, digits: number): string {
    return String(val + Math.pow(10, digits)).slice(1);
}

/**
 * Turn ms into string of the form YYYY-mm-dd HH:MM:SS.ssss
 * Crop any trailing zeros in time, except never stop right after hours
 * (we could choose to crop '-01' from date too but for now we always
 * show the whole date)
 * Optional range r is the data range that applies, also in ms.
 * If rng is big, the later parts of time will be omitted
 */
const NINETYDAYS = 90 * ONEDAY;
const THREEHOURS = 3 * ONEHOUR;
const FIVEMIN = 5 * ONEMIN;

export function ms2DateTime(ms: number, r?: number, calendar?: any): string | number {
    if(typeof ms !== 'number' || !(ms >= MIN_MS && ms <= MAX_MS)) return BADNUM;

    if(!r) r = 0;

    const msecTenths = Math.floor(mod(ms + 0.05, 1) * 10);
    const msRounded = Math.round(ms - msecTenths / 10);
    let dateStr: string, h: number, m: number, s: number, msec10: number, d: Date;

    if(isWorldCalendar(calendar)) {
        const dateJD = Math.floor(msRounded / ONEDAY) + EPOCHJD;
        const timeMs = Math.floor(mod(ms, ONEDAY));
        try {
            dateStr = getComponentMethod('calendars', 'getCal')(calendar)
                .fromJD(dateJD).formatDate('yyyy-mm-dd');
        } catch(e) {
            // invalid date in this calendar - fall back to Gyyyy-mm-dd
            dateStr = utcFormat('G%Y-%m-%d')(new Date(msRounded));
        }

        // yyyy does NOT guarantee 4-digit years. YYYY mostly does, but does
        // other things for a few calendars, so we can't trust it. Just pad
        // it manually (after the '-' if there is one)
        if(dateStr.charAt(0) === '-') {
            while(dateStr.length < 11) dateStr = '-0' + dateStr.slice(1);
        } else {
            while(dateStr.length < 10) dateStr = '0' + dateStr;
        }

        // TODO: if this is faster, we could use this block for extracting
        // the time components of regular gregorian too
        h = (r < NINETYDAYS) ? Math.floor(timeMs / ONEHOUR) : 0;
        m = (r < NINETYDAYS) ? Math.floor((timeMs % ONEHOUR) / ONEMIN) : 0;
        s = (r < THREEHOURS) ? Math.floor((timeMs % ONEMIN) / ONESEC) : 0;
        msec10 = (r < FIVEMIN) ? (timeMs % ONESEC) * 10 + msecTenths : 0;
    } else {
        d = new Date(msRounded);

        dateStr = utcFormat('%Y-%m-%d')(d);

        // <90 days: add hours and minutes - never *only* add hours
        h = (r < NINETYDAYS) ? d.getUTCHours() : 0;
        m = (r < NINETYDAYS) ? d.getUTCMinutes() : 0;
        // <3 hours: add seconds
        s = (r < THREEHOURS) ? d.getUTCSeconds() : 0;
        // <5 minutes: add ms (plus one extra digit, this is msec*10)
        msec10 = (r < FIVEMIN) ? d.getUTCMilliseconds() * 10 + msecTenths : 0;
    }

    return includeTime(dateStr, h, m, s, msec10);
}

export function ms2DateTimeLocal(ms: number): string | number {
    if(!(ms >= MIN_MS + ONEDAY && ms <= MAX_MS - ONEDAY)) return BADNUM;

    const msecTenths = Math.floor(mod(ms + 0.05, 1) * 10);
    const d = new Date(Math.round(ms - msecTenths / 10));
    const dateStr = timeFormat('%Y-%m-%d')(d);
    const h = d.getHours();
    const m = d.getMinutes();
    const s = d.getSeconds();
    const msec10 = d.getUTCMilliseconds() * 10 + msecTenths;

    return includeTime(dateStr, h, m, s, msec10);
}

function includeTime(dateStr: string, h: number, m: number, s: number, msec10: number): string {
    // include each part that has nonzero data in or after it
    if(h || m || s || msec10) {
        dateStr += ' ' + lpad(h, 2) + ':' + lpad(m, 2);
        if(s || msec10) {
            dateStr += ':' + lpad(s, 2);
            if(msec10) {
                let digits = 4;
                while(msec10 % 10 === 0) {
                    digits -= 1;
                    msec10 /= 10;
                }
                dateStr += '.' + lpad(msec10, digits);
            }
        }
    }
    return dateStr;
}

export function cleanDate(v: any, dflt?: any, calendar?: any): any {
    // let us use cleanDate to provide a missing default without an error
    if(v === BADNUM) return dflt;
    if(isJSDate(v) || (typeof v === 'number' && isFinite(v))) {
        // do not allow milliseconds (old) or jsdate objects (inherently
        // described as gregorian dates) with world calendars
        if(isWorldCalendar(calendar)) {
            Loggers.error('JS Dates and milliseconds are incompatible with world calendars', v);
            return dflt;
        }

        // NOTE: if someone puts in a year as a number rather than a string,
        // this will mistakenly convert it thinking it's milliseconds from 1970
        // that is: '2012' -> Jan. 1, 2012, but 2012 -> 2012 epoch milliseconds
        v = ms2DateTimeLocal(+v);
        if(!v && dflt !== undefined) return dflt;
    } else if(!isDateTime(v, calendar)) {
        Loggers.error('unrecognized date', v);
        return dflt;
    }
    return v;
}

/*
 *  Date formatting for ticks and hovertext
 */

/*
 * modDateFormat: Support world calendars, and add two items to
 * d3's vocabulary:
 * %{n}f where n is the max number of digits of fractional seconds
 * %h formats: half of the year as a decimal number [1,2]
 */
const fracMatch = /%\d?f/g;
const halfYearMatch = /%h/g;
const quarterToHalfYear: Record<string, string> = {
    1: '1',
    2: '1',
    3: '2',
    4: '2',
};
function modDateFormat(fmt: string, x: number, formatter: any, calendar: any): string {
    fmt = fmt.replace(fracMatch, function(match: string) {
        const digits = Math.min(+(match.charAt(1)) || 6, 6);
        const fracSecs = ((x / 1000 % 1) + 2)
            .toFixed(digits)
            .slice(2).replace(/0+$/, '') || '0';
        return fracSecs;
    });

    const d = new Date(Math.floor(x + 0.05));

    fmt = fmt.replace(halfYearMatch, function() {
        return quarterToHalfYear[formatter('%q')(d)];
    });

    if(isWorldCalendar(calendar)) {
        try {
            fmt = getComponentMethod('calendars', 'worldCalFmt')(fmt, x, calendar);
        } catch(e) {
            return 'Invalid';
        }
    }
    return formatter(fmt)(d);
}

/*
 * formatTime: create a time string from:
 *   x: milliseconds
 *   tr: tickround ('M', 'S', or # digits)
 * only supports UTC times (where every day is 24 hours and 0 is at midnight)
 */
const MAXSECONDS = [59, 59.9, 59.99, 59.999, 59.9999];
function formatTime(x: number, tr: any): string {
    const timePart = mod(x + 0.05, ONEDAY);

    let timeStr = lpad(Math.floor(timePart / ONEHOUR), 2) + ':' +
        lpad(mod(Math.floor(timePart / ONEMIN), 60), 2);

    if(tr !== 'M') {
        if(!isNumeric(tr)) tr = 0; // should only be 'S'

        /*
         * this is a weird one - and shouldn't come up unless people
         * monkey with tick0 in weird ways, but we need to do something!
         * IN PARTICULAR we had better not display garbage (see below)
         * for numbers we always round to the nearest increment of the
         * precision we're showing, and this seems like the right way to
         * handle seconds and milliseconds, as they have a decimal point
         * and people will interpret that to mean rounding like numbers.
         * but for larger increments we floor the value: it's always
         * 2013 until the ball drops on the new year. We could argue about
         * which field it is where we start rounding (should 12:08:59
         * round to 12:09 if we're stopping at minutes?) but for now I'll
         * say we round seconds but floor everything else. BUT that means
         * we need to never round up to 60 seconds, ie 23:59:60
         */
        const sec = Math.min(mod(x / ONESEC, 60), MAXSECONDS[tr]);

        let secStr = (100 + sec).toFixed(tr).slice(1);
        if(tr > 0) {
            secStr = secStr.replace(/0+$/, '').replace(/[\.]$/, '');
        }

        timeStr += ':' + secStr;
    }
    return timeStr;
}

export function formatDate(x: number, fmt: string, tr: any, formatter: any, calendar?: any, extraFormat?: any): string {
    calendar = isWorldCalendar(calendar) && calendar;

    if(!fmt) {
        if(tr === 'y') fmt = extraFormat.year;
        else if(tr === 'm') fmt = extraFormat.month;
        else if(tr === 'd') {
            fmt = extraFormat.dayMonth + '\n' + extraFormat.year;
        } else {
            return formatTime(x, tr) + '\n' + modDateFormat(extraFormat.dayMonthYear, x, formatter, calendar);
        }
    }

    return modDateFormat(fmt, x, formatter, calendar);
}

/*
 * incrementMonth: make a new milliseconds value from the given one,
 * having changed the month
 *
 * special case for world calendars: multiples of 12 are treated as years,
 * even for calendar systems that don't have (always or ever) 12 months/year
 * TODO: perhaps we need a different code for year increments to support this?
 *
 * ms (number): the initial millisecond value
 * dMonth (int): the (signed) number of months to shift
 * calendar (string): the calendar system to use
 *
 * changing month does not (and CANNOT) always preserve day, since
 * months have different lengths. The worst example of this is:
 *   d = new Date(1970,0,31); d.setMonth(1) -> Feb 31 turns into Mar 3
 *
 * But we want to be able to iterate over the last day of each month,
 * regardless of what its number is.
 * So shift 3 days forward, THEN set the new month, then unshift:
 *   1/31 -> 2/28 (or 29) -> 3/31 -> 4/30 -> ...
 *
 * Note that odd behavior still exists if you start from the 26th-28th:
 *   1/28 -> 2/28 -> 3/31
 * but at least you can't shift any dates into the wrong month,
 * and ticks on these days incrementing by month would be very unusual
 */
const THREEDAYS = 3 * ONEDAY;

export function incrementMonth(ms: number, dMonth: number, calendar?: any): number {
    calendar = isWorldCalendar(calendar) && calendar;

    // pull time out and operate on pure dates, then add time back at the end
    // this gives maximum precision - not that we *normally* care if we're
    // incrementing by month, but better to be safe!
    const timeMs = mod(ms, ONEDAY);
    ms = Math.round(ms - timeMs);

    if(calendar) {
        try {
            const dateJD = Math.round(ms / ONEDAY) + EPOCHJD;
            const calInstance = getComponentMethod('calendars', 'getCal')(calendar);
            const cDate = calInstance.fromJD(dateJD);

            if(dMonth % 12) calInstance.add(cDate, dMonth, 'm');
            else calInstance.add(cDate, dMonth / 12, 'y');

            return (cDate.toJD() - EPOCHJD) * ONEDAY + timeMs;
        } catch(e) {
            Loggers.error('invalid ms ' + ms + ' in calendar ' + calendar);
            // then keep going in gregorian even though the result will be 'Invalid'
        }
    }

    const y = new Date(ms + THREEDAYS);
    return y.setUTCMonth(y.getUTCMonth() + dMonth) + timeMs - THREEDAYS;
}

export function findExactDates(data: any[], calendar?: any): { exactYears: number; exactMonths: number; exactDays: number } {
    let exactYears = 0;
    let exactMonths = 0;
    let exactDays = 0;
    let blankCount = 0;
    let d: any;
    let di: any;

    const calInstance = (
        isWorldCalendar(calendar) &&
        getComponentMethod('calendars', 'getCal')(calendar)
    );

    for(let i = 0; i < data.length; i++) {
        di = data[i];

        // not date data at all
        if(!isNumeric(di)) {
            blankCount ++;
            continue;
        }

        // not an exact date
        if(di % ONEDAY) continue;

        if(calInstance) {
            try {
                d = calInstance.fromJD(di / ONEDAY + EPOCHJD);
                if(d.day() === 1) {
                    if(d.month() === 1) exactYears++;
                    else exactMonths++;
                } else exactDays++;
            } catch(e) {
                // invalid date in this calendar - ignore it here.
            }
        } else {
            d = new Date(di);
            if(d.getUTCDate() === 1) {
                if(d.getUTCMonth() === 0) exactYears++;
                else exactMonths++;
            } else exactDays++;
        }
    }
    exactMonths += exactYears;
    exactDays += exactMonths;

    const dataCount = data.length - blankCount;

    return {
        exactYears: exactYears / dataCount,
        exactMonths: exactMonths / dataCount,
        exactDays: exactDays / dataCount
    };
};

export default { dateTick0, dfltRange, isJSDate, dateTime2ms, isDateTime, ms2DateTime, ms2DateTimeLocal, cleanDate, formatDate, incrementMonth, findExactDates };
export { MIN_MS, MAX_MS };
