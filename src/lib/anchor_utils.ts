interface AnchorOpts {
    xanchor: string;
    yanchor: string;
    x: number;
    y: number;
}

export function isLeftAnchor(opts: AnchorOpts): boolean {
    return (
      opts.xanchor === 'left' ||
      (opts.xanchor === 'auto' && opts.x <= 1 / 3)
    );
}

export function isCenterAnchor(opts: AnchorOpts): boolean {
    return (
        opts.xanchor === 'center' ||
        (opts.xanchor === 'auto' && opts.x > 1 / 3 && opts.x < 2 / 3)
    );
}

export function isRightAnchor(opts: AnchorOpts): boolean {
    return (
      opts.xanchor === 'right' ||
      (opts.xanchor === 'auto' && opts.x >= 2 / 3)
    );
}

export function isTopAnchor(opts: AnchorOpts): boolean {
    return (
        opts.yanchor === 'top' ||
        (opts.yanchor === 'auto' && opts.y >= 2 / 3)
    );
}

export function isMiddleAnchor(opts: AnchorOpts): boolean {
    return (
        opts.yanchor === 'middle' ||
        (opts.yanchor === 'auto' && opts.y > 1 / 3 && opts.y < 2 / 3)
    );
}

export function isBottomAnchor(opts: AnchorOpts): boolean {
    return (
      opts.yanchor === 'bottom' ||
      (opts.yanchor === 'auto' && opts.y <= 1 / 3)
    );
}

export default { isLeftAnchor, isCenterAnchor, isRightAnchor, isTopAnchor, isMiddleAnchor, isBottomAnchor };
