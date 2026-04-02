import isNumeric from 'fast-isnumeric';
import _numerical from '../constants/numerical.js';
const { BADNUM } = _numerical;

// precompile for speed
const JUNK = /^['"%,$#\s']+|[, ]|['"%,$#\s']+$/g;

export default function cleanNumber(v: any): number {
    if(typeof v === 'string') {
        v = v.replace(JUNK, '');
    }

    if(isNumeric(v)) return Number(v);

    return BADNUM;
}
