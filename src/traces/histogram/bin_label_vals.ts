import type { FullAxis } from '../../../types/core';
import numConstants from '../../constants/numerical.js';
import _axes from '../../plots/cartesian/axes.js';
const { tickIncrement } = _axes;
const oneYear = numConstants.ONEAVGYEAR;
const oneMonth = numConstants.ONEAVGMONTH;
const oneDay = numConstants.ONEDAY;
const oneHour = numConstants.ONEHOUR;
const oneMin = numConstants.ONEMIN;
const oneSec = numConstants.ONESEC;

export default function getBinSpanLabelRound(leftGap: number, rightGap: number, binEdges: number[], pa: FullAxis, calendar: string): (v: number, isRightEdge?: boolean) => number {
    // the rounding digit is the largest digit that changes in *all* of 4 regions:
    // - inside the rightGap before binEdges[0] (shifted 10% to the left)
    // - inside the leftGap after binEdges[0] (expanded by 10% of rightGap on each end)
    // - same for binEdges[1]
    const dv0 = -1.1 * rightGap;
    const dv1 = -0.1 * rightGap;
    const dv2 = leftGap - dv1;
    const edge0 = binEdges[0];
    const edge1 = binEdges[1];
    const leftDigit = Math.min(
        biggestDigitChanged(edge0 + dv1, edge0 + dv2, pa, calendar),
        biggestDigitChanged(edge1 + dv1, edge1 + dv2, pa, calendar)
    );
    const rightDigit = Math.min(
        biggestDigitChanged(edge0 + dv0, edge0 + dv1, pa, calendar),
        biggestDigitChanged(edge1 + dv0, edge1 + dv1, pa, calendar)
    );

    // normally we try to make the label for the right edge different from
    // the left edge label, so it's unambiguous which bin gets data on the edge.
    // but if this results in more than 3 extra digits (or for dates, more than
    // 2 fields ie hr&min or min&sec, which is 3600x), it'll be more clutter than
    // useful so keep the label cleaner instead
    let digit, disambiguateEdges;
    if(leftDigit > rightDigit && rightDigit < Math.abs(edge1 - edge0) / 4000) {
        digit = leftDigit;
        disambiguateEdges = false;
    } else {
        digit = Math.min(leftDigit, rightDigit);
        disambiguateEdges = true;
    }

    if(pa.type === 'date' && digit > oneDay) {
        const dashExclude = (digit === oneYear) ? 1 : 6;
        const increment = (digit === oneYear) ? 'M12' : 'M1';

        return function(v, isRightEdge) {
            let dateStr = pa.c2d(v, oneYear, calendar);
            const dashPos = dateStr.indexOf('-', dashExclude);
            if(dashPos > 0) dateStr = dateStr.slice(0, dashPos);
            let roundedV = pa.d2c(dateStr, 0, calendar);

            if(roundedV < v) {
                const nextV = tickIncrement(roundedV, increment, false, calendar);
                if((roundedV + nextV) / 2 < v + leftGap) roundedV = nextV;
            }

            if(isRightEdge && disambiguateEdges) {
                return tickIncrement(roundedV, increment, true, calendar);
            }

            return roundedV;
        };
    }

    return function(v, isRightEdge) {
        let roundedV = digit * Math.round(v / digit);
        // if we rounded down and we could round up and still be < leftGap
        // (or what leftGap values round to), do that
        if(roundedV + (digit / 10) < v && roundedV + (digit * 0.9) < v + leftGap) {
            roundedV += digit;
        }
        // finally for the right edge back off one digit - but only if we can do that
        // and not clip off any data that's potentially in the bin
        if(isRightEdge && disambiguateEdges) {
            roundedV -= digit;
        }
        return roundedV;
    };
}

/*
 * Find the largest digit that changes within a (calcdata) region [v1, v2]
 * if dates, "digit" means date/time part when it's bigger than a second
 * returns the unit value to round to this digit, eg 0.01 to round to hundredths, or
 * 100 to round to hundreds. returns oneMonth or oneYear for month or year rounding,
 * so that Math.min will work, rather than 'M1' and 'M12'
 */
function biggestDigitChanged(v1: number, v2: number, pa: FullAxis, calendar: string): number {
    // are we crossing zero? can't say anything.
    // in principle this doesn't apply to dates but turns out this doesn't matter.
    if(v1 * v2 <= 0) return Infinity;

    const dv = Math.abs(v2 - v1);
    const isDate = pa.type === 'date';
    let digit = biggestGuaranteedDigitChanged(dv, isDate);
    // see if a larger digit also changed
    for(let i = 0; i < 10; i++) {
        // numbers: next digit needs to be >10x but <100x then gets rounded down.
        // dates: next digit can be as much as 60x (then rounded down)
        const nextDigit = biggestGuaranteedDigitChanged(digit * 80, isDate);
        // if we get to years, the chain stops
        if(digit === nextDigit) break;
        if(didDigitChange(nextDigit, v1, v2, isDate, pa, calendar)) digit = nextDigit;
        else break;
    }
    return digit;
}

/*
 * Find the largest digit that *definitely* changes in a region [v, v + dv] for any v
 * for nonuniform date regions (months/years) pick the largest
 */
function biggestGuaranteedDigitChanged(dv: number, isDate: boolean): number {
    if(isDate && dv > oneSec) {
        // this is supposed to be the biggest *guaranteed* change
        // so compare to the longest month and year across any calendar,
        // and we'll iterate back up later
        // note: does not support rounding larger than one year. We could add
        // that if anyone wants it, but seems unusual and not strictly necessary.
        if(dv > oneDay) {
            if(dv > oneYear * 1.1) return oneYear;
            if(dv > oneMonth * 1.1) return oneMonth;
            return oneDay;
        }

        if(dv > oneHour) return oneHour;
        if(dv > oneMin) return oneMin;
        return oneSec;
    }
    return Math.pow(10, Math.floor(Math.log(dv) / Math.LN10));
}

function didDigitChange(digit: number, v1: number, v2: number, isDate: boolean, pa: FullAxis, calendar: string): boolean {
    if(isDate && digit > oneDay) {
        const dateParts1 = dateParts(v1, pa, calendar);
        const dateParts2 = dateParts(v2, pa, calendar);
        const parti = (digit === oneYear) ? 0 : 1;
        return dateParts1[parti] !== dateParts2[parti];
    }
    return Math.floor(v2 / digit) - Math.floor(v1 / digit) > 0.1;
}

function dateParts(v: number, pa: FullAxis, calendar: string): string[] {
    const parts = pa.c2d(v, oneYear, calendar).split('-');
    if(parts[0] === '') {
        parts.unshift();
        parts[0] = '-' + parts[0];
    }
    return parts;
}
