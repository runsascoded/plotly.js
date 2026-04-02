import isNumeric from 'fast-isnumeric';
import { getModule, subplotsRegistry } from '../registry.js';
import { traceIs } from '../lib/trace_categories.js';
import { isIndex, isPlainObject, log, nestedProperty, swapAttrs, warn } from '../lib/index.js';
// Note: subplotsRegistry access goes through Registry directly
// (no longer mixed into Plots via extendFlat)
import AxisIds from '../plots/cartesian/axis_ids.js';
import Color from '../components/color/index.js';

const cleanId = AxisIds.cleanId;
const getFromTrace = AxisIds.getFromTrace;

const AX_LETTERS = ['x', 'y', 'z'];

export function clearPromiseQueue(gd?: any) {
    if (Array.isArray(gd._promises) && gd._promises.length > 0) {
        log('Clearing previous rejected promises from queue.');
    }

    gd._promises = [];
}

export function cleanLayout(layout?: any) {
    let i, j;

    if (!layout) layout = {};

    // cannot have (x|y)axis1, numbering goes axis, axis2, axis3...
    if (layout.xaxis1) {
        if (!layout.xaxis) layout.xaxis = layout.xaxis1;
        delete layout.xaxis1;
    }
    if (layout.yaxis1) {
        if (!layout.yaxis) layout.yaxis = layout.yaxis1;
        delete layout.yaxis1;
    }
    if (layout.scene1) {
        if (!layout.scene) layout.scene = layout.scene1;
        delete layout.scene1;
    }

    const axisAttrRegex = (subplotsRegistry.cartesian || {}).attrRegex;
    const polarAttrRegex = (subplotsRegistry.polar || {}).attrRegex;
    const ternaryAttrRegex = (subplotsRegistry.ternary || {}).attrRegex;
    const sceneAttrRegex = (subplotsRegistry.gl3d || {}).attrRegex;

    const keys = Object.keys(layout);
    for (i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (axisAttrRegex && axisAttrRegex.test(key)) {
            // modifications to cartesian axes

            const ax = layout[key];
            if (ax.anchor && ax.anchor !== 'free') {
                ax.anchor = cleanId(ax.anchor);
            }
            if (ax.overlaying) ax.overlaying = cleanId(ax.overlaying);

            // old method of axis type - isdate and islog (before category existed)
            if (!ax.type) {
                if (ax.isdate) ax.type = 'date';
                else if (ax.islog) ax.type = 'log';
                else if (ax.isdate === false && ax.islog === false) ax.type = 'linear';
            }
            if (ax.autorange === 'withzero' || ax.autorange === 'tozero') {
                ax.autorange = true;
                ax.rangemode = 'tozero';
            }

            if (ax.insiderange) delete ax.range;

            delete ax.islog;
            delete ax.isdate;
            delete ax.categories; // replaced by _categories

            // prune empty domain arrays made before the new nestedProperty
            if (emptyContainer(ax, 'domain')) delete ax.domain;
        }
    }

    const annotationsLen = Array.isArray(layout.annotations) ? layout.annotations.length : 0;
    for (i = 0; i < annotationsLen; i++) {
        const ann = layout.annotations[i];

        if (!isPlainObject(ann)) continue;

        cleanAxRef(ann, 'xref');
        cleanAxRef(ann, 'yref');
    }

    const shapesLen = Array.isArray(layout.shapes) ? layout.shapes.length : 0;
    for (i = 0; i < shapesLen; i++) {
        const shape = layout.shapes[i];

        if (!isPlainObject(shape)) continue;

        cleanAxRef(shape, 'xref');
        cleanAxRef(shape, 'yref');
    }

    const imagesLen = Array.isArray(layout.images) ? layout.images.length : 0;
    for (i = 0; i < imagesLen; i++) {
        const image = layout.images[i];

        if (!isPlainObject(image)) continue;

        cleanAxRef(image, 'xref');
        cleanAxRef(image, 'yref');
    }

    const legend = layout.legend;
    if (legend) {
        // check for old-style legend positioning (x or y is +/- 100)
        if (legend.x > 3) {
            legend.x = 1.02;
            legend.xanchor = 'left';
        } else if (legend.x < -2) {
            legend.x = -0.02;
            legend.xanchor = 'right';
        }

        if (legend.y > 3) {
            legend.y = 1.02;
            legend.yanchor = 'bottom';
        } else if (legend.y < -2) {
            legend.y = -0.02;
            legend.yanchor = 'top';
        }
    }

    /*
     * Moved from rotate -> orbit for dragmode
     */
    if (layout.dragmode === 'rotate') layout.dragmode = 'orbit';

    // sanitize rgb(fractions) and rgba(fractions) that old tinycolor
    // supported, but new tinycolor does not because they're not valid css
    Color.clean(layout);

    // clean the layout container in layout.template
    if (layout.template && layout.template.layout) {
        cleanLayout(layout.template.layout);
    }

    return layout;
}

function cleanAxRef(container?: any, attr?: any): void {
    const valIn = container[attr];
    const axLetter = attr.charAt(0);
    if (valIn && valIn !== 'paper') {
        container[attr] = cleanId(valIn, axLetter, true);
    }
}

export function cleanData(data?: any) {
    for (let tracei = 0; tracei < data.length; tracei++) {
        const trace = data[tracei];
        let i;

        // use xbins to bin data in x, and ybins to bin data in y
        if (trace.type === 'histogramy' && 'xbins' in trace && !('ybins' in trace)) {
            trace.ybins = trace.xbins;
            delete trace.xbins;
        }

        // now we have only one 1D histogram type, and whether
        // it uses x or y data depends on trace.orientation
        if (trace.type === 'histogramy') swapXYData(trace);
        if (trace.type === 'histogramx' || trace.type === 'histogramy') {
            trace.type = 'histogram';
        }

        // scl->scale, reversescl->reversescale
        if ('scl' in trace && !('colorscale' in trace)) {
            trace.colorscale = trace.scl;
            delete trace.scl;
        }
        if ('reversescl' in trace && !('reversescale' in trace)) {
            trace.reversescale = trace.reversescl;
            delete trace.reversescl;
        }

        // axis ids x1 -> x, y1-> y
        if (trace.xaxis) trace.xaxis = cleanId(trace.xaxis, 'x');
        if (trace.yaxis) trace.yaxis = cleanId(trace.yaxis, 'y');

        // scene ids scene1 -> scene
        if (traceIs(trace, 'gl3d') && trace.scene) {
            trace.scene = subplotsRegistry.gl3d.cleanId(trace.scene);
        }

        if (!traceIs(trace, 'pie-like') && !traceIs(trace, 'bar-like')) {
            if (Array.isArray(trace.textposition)) {
                for (i = 0; i < trace.textposition.length; i++) {
                    trace.textposition[i] = cleanTextPosition(trace.textposition[i]);
                }
            } else if (trace.textposition) {
                trace.textposition = cleanTextPosition(trace.textposition);
            }
        }

        // fix typo in colorscale definition
        const _module = getModule(trace);
        if (_module && _module.colorbar) {
            const containerName = _module.colorbar.container;
            const container = containerName ? trace[containerName] : trace;
            if (container && container.colorscale) {
                if (container.colorscale === 'YIGnBu') container.colorscale = 'YlGnBu';
                if (container.colorscale === 'YIOrRd') container.colorscale = 'YlOrRd';
            }
        }

        // fix typo in surface 'highlight*' definitions
        if (trace.type === 'surface' && isPlainObject(trace.contours)) {
            const dims = ['x', 'y', 'z'];

            for (i = 0; i < dims.length; i++) {
                const opts = trace.contours[dims[i]];

                if (!isPlainObject(opts)) continue;

                if (opts.highlightColor) {
                    opts.highlightcolor = opts.highlightColor;
                    delete opts.highlightColor;
                }

                if (opts.highlightWidth) {
                    opts.highlightwidth = opts.highlightWidth;
                    delete opts.highlightWidth;
                }
            }
        }

        // fixes from converting finance from transforms to real trace types
        if (trace.type === 'candlestick' || trace.type === 'ohlc') {
            const increasingShowlegend = (trace.increasing || {}).showlegend !== false;
            const decreasingShowlegend = (trace.decreasing || {}).showlegend !== false;
            const increasingName = cleanFinanceDir(trace.increasing);
            const decreasingName = cleanFinanceDir(trace.decreasing);

            // now figure out something smart to do with the separate direction
            // names we removed
            if (increasingName !== false && decreasingName !== false) {
                // both sub-names existed: base name previously had no effect
                // so ignore it and try to find a shared part of the sub-names

                const newName = commonPrefix(increasingName, decreasingName, increasingShowlegend, decreasingShowlegend);
                // if no common part, leave whatever name was (or wasn't) there
                if (newName) trace.name = newName;
            } else if ((increasingName || decreasingName) && !trace.name) {
                // one sub-name existed but not the base name - just use the sub-name
                trace.name = increasingName || decreasingName;
            }
        }

        // prune empty containers made before the new nestedProperty
        if (emptyContainer(trace, 'line')) delete trace.line;
        if ('marker' in trace) {
            if (emptyContainer(trace.marker, 'line')) delete trace.marker.line;
            if (emptyContainer(trace, 'marker')) delete trace.marker;
        }

        // sanitize rgb(fractions) and rgba(fractions) that old tinycolor
        // supported, but new tinycolor does not because they're not valid css
        Color.clean(trace);

        // remove obsolete autobin(x|y) attributes, but only if true
        // if false, this needs to happen in Histogram.calc because it
        // can be a one-time autobin so we need to know the results before
        // we can push them back into the trace.
        if (trace.autobinx) {
            delete trace.autobinx;
            delete trace.xbins;
        }
        if (trace.autobiny) {
            delete trace.autobiny;
            delete trace.ybins;
        }
    }
}

function cleanFinanceDir(dirContainer?: any): any {
    if (!isPlainObject(dirContainer)) return false;

    const dirName = dirContainer.name;

    delete dirContainer.name;
    delete dirContainer.showlegend;

    return (typeof dirName === 'string' || typeof dirName === 'number') && String(dirName);
}

function commonPrefix(name1?: any, name2?: any, show1?: any, show2?: any): any {
    // if only one is shown in the legend, use that
    if (show1 && !show2) return name1;
    if (show2 && !show1) return name2;

    // if both or neither are in the legend, check if one is blank (or whitespace)
    // and use the other one
    // note that hover labels can still use the name even if the legend doesn't
    if (!name1.trim()) return name2;
    if (!name2.trim()) return name1;

    const minLen = Math.min(name1.length, name2.length);
    let i;
    for (i = 0; i < minLen; i++) {
        if (name1.charAt(i) !== name2.charAt(i)) break;
    }

    const out = name1.slice(0, i);
    return out.trim();
}

// textposition - support partial attributes (ie just 'top')
// and incorrect use of middle / center etc.
function cleanTextPosition(textposition?: any): any {
    let posY = 'middle';
    let posX = 'center';

    if (typeof textposition === 'string') {
        if (textposition.indexOf('top') !== -1) posY = 'top';
        else if (textposition.indexOf('bottom') !== -1) posY = 'bottom';

        if (textposition.indexOf('left') !== -1) posX = 'left';
        else if (textposition.indexOf('right') !== -1) posX = 'right';
    }

    return posY + ' ' + posX;
}

function emptyContainer(outer?: any, innerStr?: any): any {
    return innerStr in outer && typeof outer[innerStr] === 'object' && Object.keys(outer[innerStr]).length === 0;
}

export function swapXYData(trace?: any) {
    let i;
    swapAttrs(trace, ['?', '?0', 'd?', '?bins', 'nbins?', 'autobin?', '?src', 'error_?']);
    if (Array.isArray(trace.z) && Array.isArray(trace.z[0])) {
        if (trace.transpose) delete trace.transpose;
        else trace.transpose = true;
    }
    if (trace.error_x && trace.error_y) {
        const errorY = trace.error_y;
        const copyYstyle =
            'copy_ystyle' in errorY ? errorY.copy_ystyle : !(errorY.color || errorY.thickness || errorY.width);
        swapAttrs(trace, ['error_?.copy_ystyle']);
        if (copyYstyle) {
            swapAttrs(trace, ['error_?.color', 'error_?.thickness', 'error_?.width']);
        }
    }
    if (typeof trace.hoverinfo === 'string') {
        const hoverInfoParts = trace.hoverinfo.split('+');
        for (i = 0; i < hoverInfoParts.length; i++) {
            if (hoverInfoParts[i] === 'x') hoverInfoParts[i] = 'y';
            else if (hoverInfoParts[i] === 'y') hoverInfoParts[i] = 'x';
        }
        trace.hoverinfo = hoverInfoParts.join('+');
    }
}

export function coerceTraceIndices(gd?: any, traceIndices?: any) {
    if (isNumeric(traceIndices)) {
        return [traceIndices];
    } else if (!Array.isArray(traceIndices) || !traceIndices.length) {
        return gd.data.map((_?: any, i?: any) => i);
    } else if (Array.isArray(traceIndices)) {
        const traceIndicesOut: any[] = [];
        for (let i = 0; i < traceIndices.length; i++) {
            if (isIndex(traceIndices[i], gd.data.length)) {
                traceIndicesOut.push(traceIndices[i]);
            } else {
                warn('trace index (', traceIndices[i], ') is not a number or is out of bounds');
            }
        }
        return traceIndicesOut;
    }

    return traceIndices;
}

export function manageArrayContainers(np?: any, newVal?: any, undoit?: any) {
    const obj = np.obj;
    const parts = np.parts;
    const pLength = parts.length;
    const pLast = parts[pLength - 1];

    const pLastIsNumber = isNumeric(pLast);

    if (pLastIsNumber && newVal === null) {
        // delete item

        // Clear item in array container when new value is null
        const contPath = parts.slice(0, pLength - 1).join('.');
        const cont = nestedProperty(obj, contPath).get();
        cont.splice(pLast, 1);

        // Note that nested property clears null / undefined at end of
        // array container, but not within them.
    } else if (pLastIsNumber && np.get() === undefined) {
        // create item

        // When adding a new item, make sure undo command will remove it
        if (np.get() === undefined) undoit[np.astr] = null;

        np.set(newVal);
    } else {
        // update item

        // If the last part of attribute string isn't a number,
        // np.set is all we need.
        np.set(newVal);
    }
}

/*
 * Match the part to strip off to turn an attribute into its parent
 * really it should be either '.some_characters' or '[number]'
 * but we're a little more permissive here and match either
 * '.not_brackets_or_dot' or '[not_brackets_or_dot]'
 */
const ATTR_TAIL_RE = /(\.[^\[\]\.]+|\[[^\[\]\.]+\])$/;

function getParent(attr?: any): any {
    const tail = attr.search(ATTR_TAIL_RE);
    if (tail > 0) return attr.slice(0, tail);
}

export function hasParent(aobj?: any, attr?: any) {
    let attrParent = getParent(attr);
    while (attrParent) {
        if (attrParent in aobj) return true;
        attrParent = getParent(attrParent);
    }
    return false;
}

export function clearAxisTypes(gd?: any, traces?: any, layoutUpdate?: any) {
    for (let i = 0; i < traces.length; i++) {
        const trace = gd._fullData[i];
        for (let j = 0; j < 3; j++) {
            const ax = getFromTrace(gd, trace, AX_LETTERS[j]);

            // do not clear log type - that's never an auto result so must have been intentional
            if (ax && ax.type !== 'log') {
                let axAttr = ax._name;
                const sceneName = ax._id.slice(1);
                if (sceneName.slice(0, 5) === 'scene') {
                    if (layoutUpdate[sceneName] !== undefined) continue;
                    axAttr = sceneName + '.' + axAttr;
                }
                const typeAttr = axAttr + '.type';

                if (layoutUpdate[axAttr] === undefined && layoutUpdate[typeAttr] === undefined) {
                    nestedProperty(gd.layout, typeAttr).set(null);
                }
            }
        }
    }
}

/**
 * Check if two collections (object or array) are equal
 *
 * @param {Object|Array} collection1: First collection to compare
 * @param {Object|Array} collection2: Second collection to compare
 */
const collectionsAreEqual = (collection1: any, collection2: any) => {
    const isArrayOrObject = (...vals: any[]) => vals.every((v: any) => isPlainObject(v)) || vals.every((v: any) => Array.isArray(v));
    if ([collection1, collection2].every((a) => Array.isArray(a))) {
        if (collection1.length !== collection2.length) return false;

        for (let i = 0; i < collection1.length; i++) {
            const oldVal = collection1[i];
            const newVal = collection2[i];
            if (oldVal !== newVal) {
                const equal = isArrayOrObject(oldVal, newVal) ? collectionsAreEqual(oldVal, newVal) : false;
                if (!equal) return false;
            }
        }

        return true;
    } else if ([collection1, collection2].every((a) => isPlainObject(a))) {
        if (Object.keys(collection1).length !== Object.keys(collection2).length) return false;

        for (const k in collection1) {
            if (k.startsWith('_')) continue;
            const oldVal = collection1[k];
            const newVal = collection2[k];
            if (oldVal !== newVal) {
                const equal = isArrayOrObject(oldVal, newVal) ? collectionsAreEqual(oldVal, newVal) : false;
                if (!equal) return false;
            }
        }

        return true;
    }

    return false;
};
export { collectionsAreEqual };

export default { clearPromiseQueue, cleanLayout, cleanData, swapXYData, coerceTraceIndices, manageArrayContainers, hasParent, clearAxisTypes, collectionsAreEqual };
