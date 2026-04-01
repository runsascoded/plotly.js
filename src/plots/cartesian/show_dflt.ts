export default function getShowAttrDflt(containerIn?: any): any {
    var showAttrsAll = ['showexponent', 'showtickprefix', 'showticksuffix'];
    var showAttrs = showAttrsAll.filter(function(a) {
        return containerIn[a] !== undefined;
    });
    var sameVal = function(a?: any) {
        return containerIn[a] === containerIn[showAttrs[0]];
    };

    if(showAttrs.every(sameVal) || showAttrs.length === 1) {
        return containerIn[showAttrs[0]];
    }
}
