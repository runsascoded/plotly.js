export var isLeftAnchor = function isLeftAnchor(opts) {
    return (
      opts.xanchor === 'left' ||
      (opts.xanchor === 'auto' && opts.x <= 1 / 3)
    );
};

export var isCenterAnchor = function isCenterAnchor(opts) {
    return (
        opts.xanchor === 'center' ||
        (opts.xanchor === 'auto' && opts.x > 1 / 3 && opts.x < 2 / 3)
    );
};

export var isRightAnchor = function isRightAnchor(opts) {
    return (
      opts.xanchor === 'right' ||
      (opts.xanchor === 'auto' && opts.x >= 2 / 3)
    );
};

export var isTopAnchor = function isTopAnchor(opts) {
    return (
        opts.yanchor === 'top' ||
        (opts.yanchor === 'auto' && opts.y >= 2 / 3)
    );
};

export var isMiddleAnchor = function isMiddleAnchor(opts) {
    return (
        opts.yanchor === 'middle' ||
        (opts.yanchor === 'auto' && opts.y > 1 / 3 && opts.y < 2 / 3)
    );
};

export var isBottomAnchor = function isBottomAnchor(opts) {
    return (
      opts.yanchor === 'bottom' ||
      (opts.yanchor === 'auto' && opts.y <= 1 / 3)
    );
};

export default { isLeftAnchor, isCenterAnchor, isRightAnchor, isTopAnchor, isMiddleAnchor, isBottomAnchor };
