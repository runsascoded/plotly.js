import { traceIs } from '../lib/trace_categories.js';
import Lib from '../lib/index.js';
const extendFlat = Lib.extendFlat;
const extendDeep = Lib.extendDeep;
// Put default plotTile layouts here
function cloneLayoutOverride(tileClass) {
    let override;
    switch (tileClass) {
        case 'themes__thumb':
            override = {
                autosize: true,
                width: 150,
                height: 150,
                title: { text: '' },
                showlegend: false,
                margin: { l: 5, r: 5, t: 5, b: 5, pad: 0 },
                annotations: []
            };
            break;
        case 'thumbnail':
            override = {
                title: { text: '' },
                hidesources: true,
                showlegend: false,
                borderwidth: 0,
                bordercolor: '',
                margin: { l: 1, r: 1, t: 1, b: 1, pad: 0 },
                annotations: []
            };
            break;
        default:
            override = {};
    }
    return override;
}
function keyIsAxis(keyName) {
    const types = ['xaxis', 'yaxis', 'zaxis'];
    return (types.indexOf(keyName.slice(0, 5)) > -1);
}
export default function clonePlot(graphObj, options) {
    let i;
    const oldData = graphObj.data;
    const oldLayout = graphObj.layout;
    const newData = extendDeep([], oldData);
    const newLayout = extendDeep({}, oldLayout, cloneLayoutOverride(options.tileClass));
    const context = graphObj._context || {};
    if (options.width)
        newLayout.width = options.width;
    if (options.height)
        newLayout.height = options.height;
    if (options.tileClass === 'thumbnail' || options.tileClass === 'themes__thumb') {
        // kill annotations
        newLayout.annotations = [];
        const keys = Object.keys(newLayout);
        for (i = 0; i < keys.length; i++) {
            if (keyIsAxis(keys[i])) {
                newLayout[keys[i]].title = { text: '' };
            }
        }
        // kill colorbar and pie labels
        for (i = 0; i < newData.length; i++) {
            const trace = newData[i];
            trace.showscale = false;
            if (trace.marker)
                trace.marker.showscale = false;
            if (traceIs(trace, 'pie-like'))
                trace.textposition = 'none';
        }
    }
    if (Array.isArray(options.annotations)) {
        for (i = 0; i < options.annotations.length; i++) {
            newLayout.annotations.push(options.annotations[i]);
        }
    }
    // TODO: does this scene modification really belong here?
    // If we still need it, can it move into the gl3d module?
    const sceneIds = Object.keys(newLayout).filter((key) => key.match(/^scene\d*$/));
    if (sceneIds.length) {
        let axesImageOverride = {};
        if (options.tileClass === 'thumbnail') {
            axesImageOverride = {
                title: { text: '' },
                showaxeslabels: false,
                showticklabels: false,
                linetickenable: false
            };
        }
        for (i = 0; i < sceneIds.length; i++) {
            const scene = newLayout[sceneIds[i]];
            if (!scene.xaxis) {
                scene.xaxis = {};
            }
            if (!scene.yaxis) {
                scene.yaxis = {};
            }
            if (!scene.zaxis) {
                scene.zaxis = {};
            }
            extendFlat(scene.xaxis, axesImageOverride);
            extendFlat(scene.yaxis, axesImageOverride);
            extendFlat(scene.zaxis, axesImageOverride);
            // TODO what does this do?
            scene._scene = null;
        }
    }
    const gd = document.createElement('div');
    if (options.tileClass)
        gd.className = options.tileClass;
    const plotTile = {
        gd: gd,
        td: gd, // for external (image server) compatibility
        layout: newLayout,
        data: newData,
        config: {
            staticPlot: (options.staticPlot === undefined) ?
                true :
                options.staticPlot,
            plotGlPixelRatio: (options.plotGlPixelRatio === undefined) ?
                2 :
                options.plotGlPixelRatio,
            displaylogo: options.displaylogo || false,
            showLink: options.showLink || false,
            showTips: options.showTips || false,
            mapboxAccessToken: context.mapboxAccessToken
        }
    };
    if (options.setBackground !== 'transparent') {
        plotTile.config.setBackground = options.setBackground || 'opaque';
    }
    // attaching the default Layout the gd, so you can grab it later
    plotTile.gd.defaultLayout = cloneLayoutOverride(options.tileClass);
    return plotTile;
}
