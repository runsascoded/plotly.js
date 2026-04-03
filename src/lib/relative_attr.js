// ASCEND: chop off the last nesting level - either [<n>] or .<key> - to ascend
// the attribute tree. the remaining attrString is in match[1]
const ASCEND = /^(.*)(\.[^\.\[\]]+|\[\d\])$/;
// SIMPLEATTR: is this an un-nested attribute? (no dots or brackets)
const SIMPLEATTR = /^[^\.\[\]]+$/;
export default function (baseAttr, relativeAttr) {
    while (relativeAttr) {
        const match = baseAttr.match(ASCEND);
        if (match)
            baseAttr = match[1];
        else if (baseAttr.match(SIMPLEATTR))
            baseAttr = '';
        else
            throw new Error('bad relativeAttr call:' + [baseAttr, relativeAttr]);
        if (relativeAttr.charAt(0) === '^')
            relativeAttr = relativeAttr.slice(1);
        else
            break;
    }
    if (baseAttr && relativeAttr.charAt(0) !== '[') {
        return baseAttr + '.' + relativeAttr;
    }
    return baseAttr + relativeAttr;
}
