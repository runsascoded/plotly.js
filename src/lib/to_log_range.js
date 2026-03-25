import isNumeric from 'fast-isnumeric';

export default function toLogRange(val, range) {
    if(val > 0) return Math.log(val) / Math.LN10;

    // move a negative value reference to a log axis - just put the
    // result at the lowest range value on the plot (or if the range also went negative,
    // one millionth of the top of the range)
    var newVal = Math.log(Math.min(range[0], range[1])) / Math.LN10;
    if(!isNumeric(newVal)) newVal = Math.log(Math.max(range[0], range[1])) / Math.LN10 - 6;
    return newVal;
}
