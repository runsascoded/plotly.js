export default function orientText(trace: any, xaxis: any, yaxis: any, xy: any, dxy: any, refDxy?: any) {
    const dx = dxy[0] * trace.dpdx(xaxis);
    const dy = dxy[1] * trace.dpdy(yaxis);
    let flip = 1;

    let offsetMultiplier = 1.0;
    if(refDxy) {
        const l1 = Math.sqrt(dxy[0] * dxy[0] + dxy[1] * dxy[1]);
        const l2 = Math.sqrt(refDxy[0] * refDxy[0] + refDxy[1] * refDxy[1]);
        const dot = (dxy[0] * refDxy[0] + dxy[1] * refDxy[1]) / l1 / l2;
        offsetMultiplier = Math.max(0.0, dot);
    }

    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if(angle < -90) {
        angle += 180;
        flip = -flip;
    } else if(angle > 90) {
        angle -= 180;
        flip = -flip;
    }

    return {
        angle: angle,
        flip: flip,
        p: trace.c2p(xy, xaxis, yaxis),
        offsetMultplier: offsetMultiplier
    };
}
