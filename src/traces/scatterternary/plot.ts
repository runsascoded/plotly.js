import type { GraphDiv } from '../../../types/core';
import scatterPlot from '../scatter/plot.js';

export default function plot(gd: GraphDiv, ternary, moduleCalcData) {
    var plotContainer = ternary.plotContainer;

    // remove all nodes inside the scatter layer
    plotContainer.select('.scatterlayer').selectAll('*').remove();

    // mimic cartesian plotinfo
    var xa = ternary.xaxis;
    var ya = ternary.yaxis;

    var plotinfo: any = {
        xaxis: xa,
        yaxis: ya,
        plot: plotContainer,
        layerClipId: ternary._hasClipOnAxisFalse ? ternary.clipIdRelative : null
    };

    var scatterLayer = ternary.layers.frontplot.select('g.scatterlayer');

    for(var i = 0; i < moduleCalcData.length; i++) {
        var cdi = moduleCalcData[i];
        if(cdi.length) {
            cdi[0].trace._xA = xa;
            cdi[0].trace._yA = ya;
        }
    }

    scatterPlot(gd, plotinfo, moduleCalcData, scatterLayer);
}
