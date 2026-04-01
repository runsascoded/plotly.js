export var counter = function(head: string, tail?: string, openEnded?: boolean, matchBeginning?: boolean): RegExp {
    var fullTail = (tail || '') + (openEnded ? '' : '$');
    var startWithPrefix = matchBeginning === false ? '' : '^';
    if(head === 'xy') {
        return new RegExp(startWithPrefix + 'x([2-9]|[1-9][0-9]+)?y([2-9]|[1-9][0-9]+)?' + fullTail);
    }
    return new RegExp(startWithPrefix + head + '([2-9]|[1-9][0-9]+)?' + fullTail);
};

export default { counter };
