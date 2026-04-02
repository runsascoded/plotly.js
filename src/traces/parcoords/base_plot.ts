import { select, selectAll } from 'd3-selection';
import { getModuleCalcData } from '../../plots/get_data.js';
import parcoordsPlot from './plot.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
export const name = 'parcoords';

export const plot = function(gd: any) {
    const calcData = getModuleCalcData(gd.calcdata, 'parcoords')[0];
    if(calcData.length) parcoordsPlot(gd, calcData);
};

export const clean = function(newFullData: any, newFullLayout: any, oldFullData: any, oldFullLayout: any) {
    const hadParcoords = (oldFullLayout._has && oldFullLayout._has('parcoords'));
    const hasParcoords = (newFullLayout._has && newFullLayout._has('parcoords'));

    if(hadParcoords && !hasParcoords) {
        oldFullLayout._paperdiv.selectAll('.parcoords').remove();
        oldFullLayout._glimages.selectAll('*').remove();
    }
};

export const toSVG = function(gd: any) {
    const imageRoot = gd._fullLayout._glimages;
    const root = select(gd).selectAll('.svg-container');
    const canvases = root.filter(function(d: any, i: any) {return i === root.size() - 1;})
        .selectAll('.gl-canvas-context, .gl-canvas-focus');

    function canvasToImage(this: any) {
        const canvas = this;
        const imageData = canvas.toDataURL('image/png');
        const image = imageRoot.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            preserveAspectRatio: 'none',
            x: 0,
            y: 0,
            width: canvas.style.width,
            height: canvas.style.height
        });
    }

    canvases.each(canvasToImage);

    // Chrome / Safari bug workaround - browser apparently loses connection to the defined pattern
    // Without the workaround, these browsers 'lose' the filter brush styling (color etc.) after a snapshot
    // on a subsequent interaction.
    // Firefox works fine without this workaround
    window.setTimeout(function() {
        selectAll('#filterBarPattern')
            .attr('id', 'filterBarPattern');
    }, 60);
};

export default { name, plot, clean, toSVG };
