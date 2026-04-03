import scatterPlot from '../scatter/plot.js';
export default function plot(gd, ternary, moduleCalcData) {
    const plotContainer = ternary.plotContainer;
    // remove all nodes inside the scatter layer
    plotContainer.select('.scatterlayer').selectAll('*').remove();
    // mimic cartesian plotinfo
    const xa = ternary.xaxis;
    const ya = ternary.yaxis;
    const plotinfo = {
        xaxis: xa,
        yaxis: ya,
        plot: plotContainer,
        layerClipId: ternary._hasClipOnAxisFalse ? ternary.clipIdRelative : null
    };
    const scatterLayer = ternary.layers.frontplot.select('g.scatterlayer');
    for (let i = 0; i < moduleCalcData.length; i++) {
        const cdi = moduleCalcData[i];
        if (cdi.length) {
            cdi[0].trace._xA = xa;
            cdi[0].trace._yA = ya;
        }
    }
    scatterPlot(gd, plotinfo, moduleCalcData, scatterLayer);
}
