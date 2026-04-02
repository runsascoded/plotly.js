function sign(x) {
    return (
        x < 0 ? -1 :
        x > 0 ? 1 : 0
    );
}

// adapted from Mike Bostock's https://observablehq.com/@mbostock/smith-chart
function smith(a) {
    const R = a[0];
    const X = a[1];

    if(!isFinite(R) || !isFinite(X)) return [1, 0];

    const D = (R + 1) * (R + 1) + X * X;
    return [(R * R + X * X - 1) / D, 2 * X / D];
}

function transform(subplot, a) {
    const x = a[0];
    const y = a[1];

    return [
        x * subplot.radius + subplot.cx,
        -y * subplot.radius + subplot.cy
    ];
}

function scale(subplot, r) {
    return r * subplot.radius;
}

function reactanceArc(subplot, X, R1, R2) {
    const t1 = transform(subplot, smith([R1, X]));
    const x1 = t1[0];
    const y1 = t1[1];

    const t2 = transform(subplot, smith([R2, X]));
    const x2 = t2[0];
    const y2 = t2[1];

    if(X === 0) {
        return [
            'M' + x1 + ',' + y1,
            'L' + x2 + ',' + y2
        ].join(' ');
    }

    const r = scale(subplot, 1 / Math.abs(X));

    return [
        'M' + x1 + ',' + y1,
        'A' + r + ',' + r + ' 0 0,' + (X < 0 ? 1 : 0) + ' ' + x2 + ',' + y2
    ].join(' ');
}

function resistanceArc(subplot, R, X1, X2) {
    const r = scale(subplot, 1 / (R + 1));

    const t1 = transform(subplot, smith([R, X1]));
    const x1 = t1[0];
    const y1 = t1[1];

    const t2 = transform(subplot, smith([R, X2]));
    const x2 = t2[0];
    const y2 = t2[1];

    if(sign(X1) !== sign(X2)) {
        const t0 = transform(subplot, smith([R, 0]));
        const x0 = t0[0];
        const y0 = t0[1];

        return [
            'M' + x1 + ',' + y1,
            'A' + r + ',' + r + ' 0 0,' + (0 < X1 ? 0 : 1) + ' ' + x0 + ',' + y0,
            'A' + r + ',' + r + ' 0 0,' + (X2 < 0 ? 0 : 1) + x2 + ',' + y2,
        ].join(' ');
    }

    return [
        'M' + x1 + ',' + y1,
        'A' + r + ',' + r + ' 0 0,' + (X2 < X1 ? 0 : 1) + ' ' + x2 + ',' + y2
    ].join(' ');
}

export default {
    smith: smith,
    reactanceArc: reactanceArc,
    resistanceArc: resistanceArc,
    smithTransform: transform
};
