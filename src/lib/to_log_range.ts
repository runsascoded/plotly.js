import isNumeric from 'fast-isnumeric';

export default function toLogRange(val: number, range: [number, number]): number {
    if(val > 0) return Math.log(val) / Math.LN10;

    var newVal = Math.log(Math.min(range[0], range[1])) / Math.LN10;
    if(!isNumeric(newVal)) newVal = Math.log(Math.max(range[0], range[1])) / Math.LN10 - 6;
    return newVal;
}
