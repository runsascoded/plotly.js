export default function getShowAttrDflt(containerIn?: any): any {
    const showAttrsAll = ['showexponent', 'showtickprefix', 'showticksuffix'];
    const showAttrs = showAttrsAll.filter(function(a) {
        return containerIn[a] !== undefined;
    });
    const sameVal = function(a?: any) {
        return containerIn[a] === containerIn[showAttrs[0]];
    };

    if(showAttrs.every(sameVal) || showAttrs.length === 1) {
        return containerIn[showAttrs[0]];
    }
}
