import main from './plot_api.js';
import _dom from '../lib/dom.js';
const { getGraphDiv } = _dom;
import Registry from '../registry.js';
import templateApi from './template_api.js';
import _req0 from './to_image.js';
import _req1 from './validate.js';
import _req2 from '../snapshot/download.js';
export const _doPlot = main._doPlot;
export const newPlot = main.newPlot;
export const restyle = main.restyle;
export const relayout = main.relayout;
export const redraw = main.redraw;
export const update = main.update;
export const _guiRestyle = main._guiRestyle;
export const _guiRelayout = main._guiRelayout;
export const _guiUpdate = main._guiUpdate;
export const _storeDirectGUIEdit = main._storeDirectGUIEdit;
export const react = main.react;
export const extendTraces = main.extendTraces;
export const prependTraces = main.prependTraces;
export const addTraces = main.addTraces;
export const deleteTraces = main.deleteTraces;
export const moveTraces = main.moveTraces;
export const purge = main.purge;
export const addFrames = main.addFrames;
export const deleteFrames = main.deleteFrames;
export const animate = main.animate;
export const setPlotConfig = main.setPlotConfig;

export const deleteActiveShape = function(gd?: any): any {
    return Registry.getComponentMethod('shapes', 'eraseActiveShape')(getGraphDiv(gd));
};

export const toImage = _req0;
export const validate = _req1;
export const downloadImage = _req2;
export const makeTemplate = templateApi.makeTemplate;
export const validateTemplate = templateApi.validateTemplate;

export default { _doPlot, newPlot, restyle, relayout, redraw, update, _guiRestyle, _guiRelayout, _guiUpdate, _storeDirectGUIEdit, react, extendTraces, prependTraces, addTraces, deleteTraces, moveTraces, purge, addFrames, deleteFrames, animate, setPlotConfig, deleteActiveShape, toImage, validate, downloadImage, makeTemplate, validateTemplate };
