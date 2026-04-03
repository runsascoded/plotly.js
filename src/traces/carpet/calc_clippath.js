export default function makeClipPath(xctrl, yctrl, aax, bax) {
    let i, x, y;
    const segments = [];
    const asmoothing = !!aax.smoothing;
    const bsmoothing = !!bax.smoothing;
    const nea1 = xctrl[0].length - 1;
    const neb1 = xctrl.length - 1;
    // Along the lower a axis:
    for (i = 0, x = [], y = []; i <= nea1; i++) {
        x[i] = xctrl[0][i];
        y[i] = yctrl[0][i];
    }
    segments.push({ x: x, y: y, bicubic: asmoothing });
    // Along the upper b axis:
    for (i = 0, x = [], y = []; i <= neb1; i++) {
        x[i] = xctrl[i][nea1];
        y[i] = yctrl[i][nea1];
    }
    segments.push({ x: x, y: y, bicubic: bsmoothing });
    // Backwards along the upper a axis:
    for (i = nea1, x = [], y = []; i >= 0; i--) {
        x[nea1 - i] = xctrl[neb1][i];
        y[nea1 - i] = yctrl[neb1][i];
    }
    segments.push({ x: x, y: y, bicubic: asmoothing });
    // Backwards along the lower b axis:
    for (i = neb1, x = [], y = []; i >= 0; i--) {
        x[neb1 - i] = xctrl[i][0];
        y[neb1 - i] = yctrl[i][0];
    }
    segments.push({ x: x, y: y, bicubic: bsmoothing });
    return segments;
}
