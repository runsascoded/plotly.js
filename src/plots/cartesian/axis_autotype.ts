import isNumeric from 'fast-isnumeric';
import { cleanNumber, isArrayOrTypedArray, isDateTime } from '../../lib/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

const round = Math.round;

export default function autoType(array?: any, calendar?: any, opts?: any): string {
    let a = array;

    const noMultiCategory = opts.noMultiCategory;
    if(isArrayOrTypedArray(a) && !a.length) return '-';
    if(!noMultiCategory && multiCategory(a)) return 'multicategory';
    if(noMultiCategory && Array.isArray(a[0])) { // no need to flat typed arrays here
        const b: any[] = [];
        for(let i = 0; i < a.length; i++) {
            if(isArrayOrTypedArray(a[i])) {
                for(let j = 0; j < a[i].length; j++) {
                    b.push(a[i][j]);
                }
            }
        }
        a = b;
    }

    if(moreDates(a, calendar)) return 'date';

    const convertNumeric = opts.autotypenumbers !== 'strict'; // compare against strict, just in case autotypenumbers was not provided in opts
    if(category(a, convertNumeric)) return 'category';
    if(linearOK(a, convertNumeric)) return 'linear';

    return '-';
}

function hasTypeNumber(v?: any, convertNumeric?: any): any {
    return convertNumeric ? isNumeric(v) : typeof v === 'number';
}

// is there at least one number in array? If not, we should leave
// ax.type empty so it can be autoset later
function linearOK(a?: any, convertNumeric?: any): boolean {
    const len = a.length;

    for(let i = 0; i < len; i++) {
        if(hasTypeNumber(a[i], convertNumeric)) return true;
    }

    return false;
}

// does the array a have mostly dates rather than numbers?
// note: some values can be neither (such as blanks, text)
// 2- or 4-digit integers can be both, so require twice as many
// dates as non-dates, to exclude cases with mostly 2 & 4 digit
// numbers and a few dates
// as with categories, consider DISTINCT values only.
function moreDates(a?: any, calendar?: any): boolean {
    const len = a.length;

    const inc = getIncrement(len);
    let dats = 0;
    let nums = 0;
    const seen = {};

    for(let f = 0; f < len; f += inc) {
        const i = round(f);
        const ai = a[i];
        const stri = String(ai);
        if((seen as any)[stri]) continue;
        (seen as any)[stri] = 1;

        if(isDateTime(ai, calendar)) dats++;
        if(isNumeric(ai)) nums++;
    }

    return dats > nums * 2;
}

// return increment to test at most 1000 points, evenly spaced
function getIncrement(len?: any): number {
    return Math.max(1, (len - 1) / 1000);
}

// are the (x,y)-values in gd.data mostly text?
// require twice as many DISTINCT categories as distinct numbers
function category(a?: any, convertNumeric?: any): boolean {
    const len = a.length;

    const inc = getIncrement(len);
    let nums = 0;
    let cats = 0;
    const seen: any = {};

    for(let f = 0; f < len; f += inc) {
        const i = round(f);
        const ai = a[i];
        const stri = String(ai);
        if(seen[stri]) continue;
        seen[stri] = 1;

        const t = typeof ai;
        if(t === 'boolean') cats++;
        else if(convertNumeric ? cleanNumber(ai) !== BADNUM : t === 'number') nums++;
        else if(t === 'string') cats++;
    }

    return cats > nums * 2;
}

// very-loose requirements for multicategory,
// trace modules that should never auto-type to multicategory
// should be declared with 'noMultiCategory'
function multiCategory(a?: any): any {
    return isArrayOrTypedArray(a[0]) && isArrayOrTypedArray(a[1]);
}
