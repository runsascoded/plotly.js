import _alignment from '../../constants/alignment.js';
const { FROM_BL } = _alignment;

export default function scaleZoom(ax?: any, factor?: any, centerFraction?: any): void {
    if(centerFraction === undefined) {
        centerFraction = (FROM_BL as any)[ax.constraintoward || 'center'];
    }

    const rangeLinear = [ax.r2l(ax.range[0]), ax.r2l(ax.range[1])];
    const center = rangeLinear[0] + (rangeLinear[1] - rangeLinear[0]) * centerFraction;

    ax.range = ax._input.range = [
        ax.l2r(center + (rangeLinear[0] - center) * factor),
        ax.l2r(center + (rangeLinear[1] - center) * factor)
    ];
    ax.setScale();
}
