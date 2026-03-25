import d3 from '@plotly/d3';
import { getModuleCalcData } from '../../plots/get_data.js';
import parcoordsPlot from './plot.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
export var name = 'parcoords';

export var plot = function(gd) {
    var calcData = getModuleCalcData(gd.calcdata, 'parcoords')[0];
    if(calcData.length) parcoordsPlot(gd, calcData);
};

export var clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var hadParcoords = (oldFullLayout._has && oldFullLayout._has('parcoords'));
    var hasParcoords = (newFullLayout._has && newFullLayout._has('parcoords'));

    if(hadParcoords && !hasParcoords) {
        oldFullLayout._paperdiv.selectAll('.parcoords').remove();
        oldFullLayout._glimages.selectAll('*').remove();
    }
};

export var toSVG = function(gd) {
    var imageRoot = gd._fullLayout._glimages;
    var root = d3.select(gd).selectAll('.svg-container');
    var canvases = root.filter(function(d, i) {return i === root.size() - 1;})
        .selectAll('.gl-canvas-context, .gl-canvas-focus');

    function canvasToImage() {
        var canvas = this;
        var imageData = canvas.toDataURL('image/png');
        var image = imageRoot.append('svg:image');

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
        d3.selectAll('#filterBarPattern')
            .attr('id', 'filterBarPattern');
    }, 60);
};

export default { name, plot, clean, toSVG };
