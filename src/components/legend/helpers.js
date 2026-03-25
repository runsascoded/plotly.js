export var isGrouped = function isGrouped(legendLayout) {
    return (legendLayout.traceorder || '').indexOf('grouped') !== -1;
};

export var isVertical = function isVertical(legendLayout) {
    return legendLayout.orientation !== 'h';
};

export var isReversed = function isReversed(legendLayout) {
    return (legendLayout.traceorder || '').indexOf('reversed') !== -1;
};

export default { isGrouped, isVertical, isReversed };
