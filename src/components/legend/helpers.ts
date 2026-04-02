export const isGrouped = function isGrouped(legendLayout: any): boolean {
    return (legendLayout.traceorder || '').indexOf('grouped') !== -1;
};

export const isVertical = function isVertical(legendLayout: any): boolean {
    return legendLayout.orientation !== 'h';
};

export const isReversed = function isReversed(legendLayout: any): boolean {
    return (legendLayout.traceorder || '').indexOf('reversed') !== -1;
};

export default { isGrouped, isVertical, isReversed };
