import Registry from '../registry.js';

export default function containerArrayMatch(astr) {
    var rootContainers = Registry.layoutArrayContainers;
    var regexpContainers = Registry.layoutArrayRegexes;
    var rootPart = astr.split('[')[0];
    var arrayStr;
    var match;

    // look for regexp matches first, because they may be nested inside root matches
    // eg updatemenus[i].buttons is nested inside updatemenus
    for(var i = 0; i < regexpContainers.length; i++) {
        match = astr.match(regexpContainers[i]);
        if(match && match.index === 0) {
            arrayStr = match[0];
            break;
        }
    }

    // now look for root matches
    if(!arrayStr) arrayStr = rootContainers[rootContainers.indexOf(rootPart)];

    if(!arrayStr) return false;

    var tail = astr.slice(arrayStr.length);
    if(!tail) return {array: arrayStr, index: '', property: ''};

    match = tail.match(/^\[(0|[1-9][0-9]*)\](\.(.+))?$/);
    if(!match) return false;

    return {array: arrayStr, index: Number(match[1]), property: match[3] || ''};
}
