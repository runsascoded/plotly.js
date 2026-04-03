import { select, selectAll } from 'd3-selection';
import { getModuleCalcData } from '../../plots/get_data.js';
import parcoordsPlot from './plot.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
export const name = 'parcoords';
export function plot(gd) {
    const calcData = getModuleCalcData(gd.calcdata, 'parcoords')[0];
    if (calcData.length)
        parcoordsPlot(gd, calcData);
}
export function clean(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const hadParcoords = (oldFullLayout._has && oldFullLayout._has('parcoords'));
    const hasParcoords = (newFullLayout._has && newFullLayout._has('parcoords'));
    if (hadParcoords && !hasParcoords) {
        oldFullLayout._paperdiv.selectAll('.parcoords').remove();
        oldFullLayout._glimages.selectAll('*').remove();
    }
}
export function toSVG(gd) {
    const imageRoot = gd._fullLayout._glimages;
    const root = select(gd).selectAll('.svg-container');
    const canvases = root.filter((d, i) => i === root.size() - 1)
        .selectAll('.gl-canvas-context, .gl-canvas-focus');
    function canvasToImage() {
        const canvas = this;
        const imageData = canvas.toDataURL('image/png');
        const image = imageRoot.append('svg:image');
        image
            .attr('xmlns', xmlnsNamespaces.svg)
            .attr('xlink:href', imageData)
            .attr('preserveAspectRatio', 'none')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', canvas.style.width)
            .attr('height', canvas.style.height);
    }
    canvases.each(canvasToImage);
    // Chrome / Safari bug workaround - browser apparently loses connection to the defined pattern
    // Without the workaround, these browsers 'lose' the filter brush styling (color etc.) after a snapshot
    // on a subsequent interaction.
    // Firefox works fine without this workaround
    window.setTimeout(function () {
        selectAll('#filterBarPattern')
            .attr('id', 'filterBarPattern');
    }, 60);
}
export default { name, plot, clean, toSVG };
