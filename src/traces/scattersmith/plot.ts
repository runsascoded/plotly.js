import type { GraphDiv, PlotInfo } from '../../../types/core';
import scatterPlot from '../scatter/plot.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import helpers from '../../plots/smith/helpers.js';
const smith = helpers.smith;

export default function plot(gd: GraphDiv, subplot: PlotInfo, moduleCalcData) {
    const mlayer = subplot.layers.frontplot.select('g.scatterlayer');

    const xa = subplot.xaxis;
    const ya = subplot.yaxis;

    const plotinfo: any = {
        xaxis: xa,
        yaxis: ya,
        plot: subplot.framework,
        layerClipId: subplot._hasClipOnAxisFalse ? subplot.clipIds.forTraces : null
    };

    // convert:
    // 'c' (real,imag) -> (x,y)
    for(let i = 0; i < moduleCalcData.length; i++) {
        const cdi = moduleCalcData[i];

        for(let j = 0; j < cdi.length; j++) {
            if(j === 0) {
                cdi[0].trace._xA = xa;
                cdi[0].trace._yA = ya;
            }

            const cd = cdi[j];
            const real = cd.real;

            if(real === BADNUM) {
                cd.x = cd.y = BADNUM;
            } else {
                const t = smith([real, cd.imag]);

                cd.x = t[0];
                cd.y = t[1];
            }
        }
    }

    scatterPlot(gd, plotinfo, moduleCalcData, mlayer);
}
