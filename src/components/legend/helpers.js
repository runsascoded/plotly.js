export function isGrouped(legendLayout) {
    return (legendLayout.traceorder || '').indexOf('grouped') !== -1;
}
export function isVertical(legendLayout) {
    return legendLayout.orientation !== 'h';
}
export function isReversed(legendLayout) {
    return (legendLayout.traceorder || '').indexOf('reversed') !== -1;
}
export default { isGrouped, isVertical, isReversed };
