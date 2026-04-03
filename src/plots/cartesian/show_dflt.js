export default function getShowAttrDflt(containerIn) {
    const showAttrsAll = ['showexponent', 'showtickprefix', 'showticksuffix'];
    const showAttrs = showAttrsAll.filter((a) => containerIn[a] !== undefined);
    const sameVal = (a) => {
        return containerIn[a] === containerIn[showAttrs[0]];
    };
    if (showAttrs.every(sameVal) || showAttrs.length === 1) {
        return containerIn[showAttrs[0]];
    }
}
