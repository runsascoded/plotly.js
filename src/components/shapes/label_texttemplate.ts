// Wrapper functions to handle paper-referenced shapes, which have no axis

function d2l(v: any, axis: any) {
    return axis ? axis.d2l(v) : v;
}

function l2d(v: any, axis: any) {
    return axis ? axis.l2d(v) : v;
}

function x0Fn(shape: any) { return shape.x0; }
function x1Fn(shape: any) { return shape.x1; }
function y0Fn(shape: any) { return shape.y0; }
function y1Fn(shape: any) { return shape.y1; }

function x0shiftFn(shape: any) { return shape.x0shift || 0; }
function x1shiftFn(shape: any) { return shape.x1shift || 0; }
function y0shiftFn(shape: any) { return shape.y0shift || 0; }
function y1shiftFn(shape: any) { return shape.y1shift || 0; }

function dxFn(shape: any, xa: any) {
    return d2l(shape.x1, xa) + x1shiftFn(shape) - d2l(shape.x0, xa) - x0shiftFn(shape);
}

function dyFn(shape: any, xa: any, ya: any) {
    return d2l(shape.y1, ya) + y1shiftFn(shape) - d2l(shape.y0, ya) - y0shiftFn(shape);
}

function widthFn(shape: any, xa: any) {
    return Math.abs(dxFn(shape, xa));
}

function heightFn(shape: any, xa: any, ya: any) {
    return Math.abs(dyFn(shape, xa, ya));
}

function lengthFn(shape: any, xa: any, ya: any) {
    return (shape.type !== 'line') ? undefined :
        Math.sqrt(
            Math.pow(dxFn(shape, xa), 2) +
            Math.pow(dyFn(shape, xa, ya), 2)
        );
}

function xcenterFn(shape: any, xa: any) {
    return l2d((d2l(shape.x1, xa) + x1shiftFn(shape) + d2l(shape.x0, xa) + x0shiftFn(shape)) / 2, xa);
}

function ycenterFn(shape: any, xa: any, ya: any) {
    return l2d((d2l(shape.y1, ya) + y1shiftFn(shape) + d2l(shape.y0, ya) + y0shiftFn(shape)) / 2, ya);
}

function slopeFn(shape: any, xa: any, ya: any) {
    return (shape.type !== 'line') ? undefined : (
        dyFn(shape, xa, ya) / dxFn(shape, xa)
    );
}

export default {
    x0: x0Fn,
    x1: x1Fn,
    y0: y0Fn,
    y1: y1Fn,
    slope: slopeFn,
    dx: dxFn,
    dy: dyFn,
    width: widthFn,
    height: heightFn,
    length: lengthFn,
    xcenter: xcenterFn,
    ycenter: ycenterFn,
};
