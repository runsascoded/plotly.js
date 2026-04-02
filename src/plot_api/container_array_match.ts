import Registry from '../registry.js';

export default function containerArrayMatch(astr?: any): any {
    const rootContainers = Registry.layoutArrayContainers;
    const regexpContainers = Registry.layoutArrayRegexes;
    const rootPart = astr.split('[')[0];
    let arrayStr;
    let match;

    // look for regexp matches first, because they may be nested inside root matches
    // eg updatemenus[i].buttons is nested inside updatemenus
    for(let i = 0; i < regexpContainers.length; i++) {
        match = astr.match(regexpContainers[i]);
        if(match && match.index === 0) {
            arrayStr = match[0];
            break;
        }
    }

    // now look for root matches
    if(!arrayStr) arrayStr = rootContainers[rootContainers.indexOf(rootPart)];

    if(!arrayStr) return false;

    const tail = astr.slice(arrayStr.length);
    if(!tail) return {array: arrayStr, index: '', property: ''};

    match = tail.match(/^\[(0|[1-9][0-9]*)\](\.(.+))?$/);
    if(!match) return false;

    return {array: arrayStr, index: Number(match[1]), property: match[3] || ''};
}
