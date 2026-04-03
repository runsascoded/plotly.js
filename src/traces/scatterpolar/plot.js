import scatterPlot from '../scatter/plot.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
export default function plot(gd, subplot, moduleCalcData) {
    const mlayer = subplot.layers.frontplot.select('g.scatterlayer');
    const xa = subplot.xaxis;
    const ya = subplot.yaxis;
    const plotinfo = {
        xaxis: xa,
        yaxis: ya,
        plot: subplot.framework,
        layerClipId: subplot._hasClipOnAxisFalse ? subplot.clipIds.forTraces : null
    };
    const radialAxis = subplot.radialAxis;
    const angularAxis = subplot.angularAxis;
    // convert:
    // 'c' (r,theta) -> 'geometric' (r,theta) -> (x,y)
    for (let i = 0; i < moduleCalcData.length; i++) {
        const cdi = moduleCalcData[i];
        for (let j = 0; j < cdi.length; j++) {
            if (j === 0) {
                cdi[0].trace._xA = xa;
                cdi[0].trace._yA = ya;
            }
            const cd = cdi[j];
            const r = cd.r;
            if (r === BADNUM) {
                cd.x = cd.y = BADNUM;
            }
            else {
                const rg = radialAxis.c2g(r);
                const thetag = angularAxis.c2g(cd.theta);
                cd.x = rg * Math.cos(thetag);
                cd.y = rg * Math.sin(thetag);
            }
        }
    }
    scatterPlot(gd, plotinfo, moduleCalcData, mlayer);
}
