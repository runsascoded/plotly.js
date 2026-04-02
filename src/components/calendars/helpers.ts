import calendars from './calendars.js';
import constants from '../../constants/numerical.js';

const EPOCHJD = constants.EPOCHJD;
const ONEDAY = constants.ONEDAY;

export const CANONICAL_TICK: Record<string, string> = {
    chinese: '2000-01-01',
    coptic: '2000-01-01',
    discworld: '2000-01-01',
    ethiopian: '2000-01-01',
    hebrew: '5000-01-01',
    islamic: '1000-01-01',
    julian: '2000-01-01',
    mayan: '5000-01-01',
    nanakshahi: '1000-01-01',
    nepali: '2000-01-01',
    persian: '1000-01-01',
    jalali: '1000-01-01',
    taiwan: '1000-01-01',
    thai: '2000-01-01',
    ummalqura: '1400-01-01'
};

export const CANONICAL_SUNDAY: Record<string, string> = {
    chinese: '2000-01-02',
    coptic: '2000-01-03',
    discworld: '2000-01-03',
    ethiopian: '2000-01-05',
    hebrew: '5000-01-01',
    islamic: '1000-01-02',
    julian: '2000-01-03',
    mayan: '5000-01-01',
    nanakshahi: '1000-01-05',
    nepali: '2000-01-05',
    persian: '1000-01-01',
    jalali: '1000-01-01',
    taiwan: '1000-01-04',
    thai: '2000-01-04',
    ummalqura: '1400-01-06'
};

export const DFLTRANGE: Record<string, string[]> = {
    chinese: ['2000-01-01', '2001-01-01'],
    coptic: ['1700-01-01', '1701-01-01'],
    discworld: ['1800-01-01', '1801-01-01'],
    ethiopian: ['2000-01-01', '2001-01-01'],
    hebrew: ['5700-01-01', '5701-01-01'],
    islamic: ['1400-01-01', '1401-01-01'],
    julian: ['2000-01-01', '2001-01-01'],
    mayan: ['5200-01-01', '5201-01-01'],
    nanakshahi: ['0500-01-01', '0501-01-01'],
    nepali: ['2000-01-01', '2001-01-01'],
    persian: ['1400-01-01', '1401-01-01'],
    jalali: ['1400-01-01', '1401-01-01'],
    taiwan: ['0100-01-01', '0101-01-01'],
    thai: ['2500-01-01', '2501-01-01'],
    ummalqura: ['1400-01-01', '1401-01-01']
};

const UNKNOWN = '##';
const d3ToWorldCalendars: any = {
    d: {0: 'dd', '-': 'd'},
    e: {0: 'd', '-': 'd'},
    a: {0: 'D', '-': 'D'},
    A: {0: 'DD', '-': 'DD'},
    j: {0: 'oo', '-': 'o'},
    W: {0: 'ww', '-': 'w'},
    m: {0: 'mm', '-': 'm'},
    b: {0: 'M', '-': 'M'},
    B: {0: 'MM', '-': 'MM'},
    y: {0: 'yy', '-': 'yy'},
    Y: {0: 'yyyy', '-': 'yyyy'},
    U: UNKNOWN,
    w: UNKNOWN,
    c: {0: 'D M d %X yyyy', '-': 'D M d %X yyyy'},
    x: {0: 'mm/dd/yyyy', '-': 'mm/dd/yyyy'}
};

export function worldCalFmt(fmt: any, x: any, calendar: any) {
    const dateJD = Math.floor((x + 0.05) / ONEDAY) + EPOCHJD;
    const cDate = getCal(calendar).fromJD(dateJD);
    let i = 0;
    let modifier, directive, directiveLen, directiveObj, replacementPart;

    while((i = fmt.indexOf('%', i)) !== -1) {
        modifier = fmt.charAt(i + 1);
        if(modifier === '0' || modifier === '-' || modifier === '_') {
            directiveLen = 3;
            directive = fmt.charAt(i + 2);
            if(modifier === '_') modifier = '-';
        } else {
            directive = modifier;
            modifier = '0';
            directiveLen = 2;
        }
        directiveObj = d3ToWorldCalendars[directive];
        if(!directiveObj) {
            i += directiveLen;
        } else {
            if(directiveObj === UNKNOWN) replacementPart = UNKNOWN;
            else replacementPart = cDate.formatDate(directiveObj[modifier]);

            fmt = fmt.slice(0, i) + replacementPart + fmt.slice(i + directiveLen);
            i += replacementPart.length;
        }
    }
    return fmt;
}

const allCals: any = {};
export function getCal(calendar: any) {
    let calendarObj = allCals[calendar];
    if(calendarObj) return calendarObj;

    calendarObj = allCals[calendar] = calendars.instance(calendar);
    return calendarObj;
}
