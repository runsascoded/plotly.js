import main from './plot_api.js';
import _dom from '../lib/dom.js';
const { getGraphDiv } = _dom;
import Registry from '../registry.js';
import templateApi from './template_api.js';
import _req0 from './to_image.js';
import _req1 from './validate.js';
import _req2 from '../snapshot/download.js';
export var _doPlot = main._doPlot;
export var newPlot = main.newPlot;
export var restyle = main.restyle;
export var relayout = main.relayout;
export var redraw = main.redraw;
export var update = main.update;
export var _guiRestyle = main._guiRestyle;
export var _guiRelayout = main._guiRelayout;
export var _guiUpdate = main._guiUpdate;
export var _storeDirectGUIEdit = main._storeDirectGUIEdit;
export var react = main.react;
export var extendTraces = main.extendTraces;
export var prependTraces = main.prependTraces;
export var addTraces = main.addTraces;
export var deleteTraces = main.deleteTraces;
export var moveTraces = main.moveTraces;
export var purge = main.purge;
export var addFrames = main.addFrames;
export var deleteFrames = main.deleteFrames;
export var animate = main.animate;
export var setPlotConfig = main.setPlotConfig;

export var deleteActiveShape = function(gd?: any): any {
    return Registry.getComponentMethod('shapes', 'eraseActiveShape')(getGraphDiv(gd));
};

export var toImage = _req0;
export var validate = _req1;
export var downloadImage = _req2;
export var makeTemplate = templateApi.makeTemplate;
export var validateTemplate = templateApi.validateTemplate;

export default { _doPlot, newPlot, restyle, relayout, redraw, update, _guiRestyle, _guiRelayout, _guiUpdate, _storeDirectGUIEdit, react, extendTraces, prependTraces, addTraces, deleteTraces, moveTraces, purge, addFrames, deleteFrames, animate, setPlotConfig, deleteActiveShape, toImage, validate, downloadImage, makeTemplate, validateTemplate };
