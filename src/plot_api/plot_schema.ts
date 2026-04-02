import Registry from '../registry.js';
import Lib, { extendDeepAll, isArrayOrTypedArray, isPlainObject, nestedProperty, valObjectMeta } from '../lib/index.js';
import baseAttributes from '../plots/attributes.js';
import baseLayoutAttributes from '../plots/layout_attributes.js';
import frameAttributes from '../plots/frame_attributes.js';
import animationAttributes from '../plots/animation_attributes.js';
import _plot_config from './plot_config.js';
const { configAttributes } = _plot_config;
import editTypes from './edit_types.js';


const IS_SUBPLOT_OBJ = '_isSubplotObj';
const IS_LINKED_TO_ARRAY = '_isLinkedToArray';
const ARRAY_ATTR_REGEXPS = '_arrayAttrRegexps';
const DEPRECATED = '_deprecated';
const UNDERSCORE_ATTRS = [IS_SUBPLOT_OBJ, IS_LINKED_TO_ARRAY, ARRAY_ATTR_REGEXPS, DEPRECATED];

export { IS_SUBPLOT_OBJ };
export { IS_LINKED_TO_ARRAY };
export { DEPRECATED };
export { UNDERSCORE_ATTRS };

export function get(): any {
    const traces: any = {};

    Registry.allTypes.forEach((type) => {
        traces[type] = getTraceAttributes(type);
    });

    return {
        defs: {
            valObjects: valObjectMeta,
            metaKeys: UNDERSCORE_ATTRS.concat(['description', 'role', 'editType', 'impliedEdits']),
            editType: {
                traces: editTypes.traces,
                layout: editTypes.layout
            },
            impliedEdits: {
                description: [
                    'Sometimes when an attribute is changed, other attributes',
                    'must be altered as well in order to achieve the intended',
                    'result. For example, when `range` is specified, it is',
                    'important to set `autorange` to `false` or the new `range`',
                    'value would be lost in the redraw. `impliedEdits` is the',
                    'mechanism to do this: `impliedEdits: {autorange: false}`.',
                    'Each key is a relative paths to the attribute string to',
                    'change, using *^* to ascend into the parent container,',
                    'for example `range[0]` has `impliedEdits: {*^autorange*: false}`.',
                    'A value of `undefined` means that the attribute will not be',
                    'changed, but its previous value should be recorded in case',
                    'we want to reverse this change later. For example, `autorange`',
                    'has `impliedEdits: {*range[0]*: undefined, *range[1]*:undefined}',
                    'because the range will likely be changed by redraw.'
                ].join(' ')
            }
        },

        traces: traces,
        layout: getLayoutAttributes(),

        frames: getFramesAttributes(),
        animation: formatAttributes(animationAttributes),

        config: formatAttributes(configAttributes)
    };
}

export function crawl(attrs?: any, callback?: any, specifiedLevel?: any, attrString?: any): void {
    const level = specifiedLevel || 0;
    attrString = attrString || '';

    Object.keys(attrs).forEach((attrName) => {
        const attr: any = attrs[attrName];

        if(UNDERSCORE_ATTRS.indexOf(attrName) !== -1) return;

        const fullAttrString = (attrString ? attrString + '.' : '') + attrName;
        callback(attr, attrName, attrs, level, fullAttrString);

        if(isValObject(attr)) return;

        if(isPlainObject(attr) && attrName !== 'impliedEdits') {
            crawl(attr, callback, level + 1, fullAttrString);
        }
    });
}

export function isValObject(obj?: any): boolean {
    return obj && obj.valType !== undefined;
}

export function findArrayAttributes(trace?: any): any {
    const arrayAttributes: any[] = [];
    let stack: any[] = [];
    let isArrayStack: any[] = [];
    let baseContainer: any, baseAttrName: any;

    function callback(attr?: any, attrName?: any, attrs?: any, level?: any) {
        stack = stack.slice(0, level).concat([(attrName as any)]);
        isArrayStack = isArrayStack.slice(0, level).concat([(attr && attr._isLinkedToArray as any)]);

        const splittableAttr = (
            attr &&
            (attr.valType === 'data_array' || attr.arrayOk === true) &&
            !(stack[level - 1] === 'colorbar' && (attrName === 'ticktext' || attrName === 'tickvals'))
        );

        // Manually exclude 'colorbar.tickvals' and 'colorbar.ticktext' for now
        // which are declared as `valType: 'data_array'` but scale independently of
        // the coordinate arrays.
        //
        // Down the road, we might want to add a schema field (e.g `uncorrelatedArray: true`)
        // to distinguish attributes of the likes.

        if(!splittableAttr) return;

        crawlIntoTrace(baseContainer, 0, '');
    }

    function crawlIntoTrace(container?: any, i?: any, astrPartial?: any) {
        const item = container[stack[i]];
        const newAstrPartial = astrPartial + stack[i];
        if(i === stack.length - 1) {
            if(isArrayOrTypedArray(item)) {
                arrayAttributes.push(baseAttrName + newAstrPartial);
            }
        } else {
            if(isArrayStack[i]) {
                if(Array.isArray(item)) {
                    for(let j = 0; j < item.length; j++) {
                        if(isPlainObject(item[j])) {
                            crawlIntoTrace(item[j], i + 1, newAstrPartial + '[' + j + '].');
                        }
                    }
                }
            } else if(isPlainObject(item)) {
                crawlIntoTrace(item, i + 1, newAstrPartial + '.');
            }
        }
    }

    baseContainer = trace;
    baseAttrName = '';
    crawl(baseAttributes, callback);
    if(trace._module && trace._module.attributes) {
        crawl(trace._module.attributes, callback);
    }

    return arrayAttributes;
}

export function getTraceValObject(trace?: any, parts?: any): any {
    const head = parts[0];
    const i = 1; // index to start recursing from
    let moduleAttrs, valObject;

    // first look in the module for this trace
    // components have already merged their trace attributes in here
    let _module: any = trace._module;
    if(!_module) _module = (Registry.modules[trace.type || baseAttributes.type.dflt] || {})._module;
    if(!_module) return false;

    moduleAttrs = _module.attributes;
    valObject = moduleAttrs && moduleAttrs[head];

    // then look in the subplot attributes
    if(!valObject) {
        const subplotModule = _module.basePlotModule;
        if(subplotModule && subplotModule.attributes) {
            valObject = subplotModule.attributes[head];
        }
    }

    // finally look in the global attributes
    if(!valObject) valObject = (baseAttributes as any)[head];

    return recurseIntoValObject(valObject, parts, i);
}

export function getLayoutValObject(fullLayout?: any, parts?: any): any {
    const valObject: any = layoutHeadAttr(fullLayout, parts[0]);

    return recurseIntoValObject(valObject, parts, 1);
}

function layoutHeadAttr(fullLayout?: any, head?: any): boolean {
    let i, key, _module, attributes;

    // look for attributes of the subplot types used on the plot
    const basePlotModules = fullLayout._basePlotModules;
    if(basePlotModules) {
        let out;
        for(i = 0; i < basePlotModules.length; i++) {
            _module = basePlotModules[i];
            if(_module.attrRegex && _module.attrRegex.test(head)) {
                // if a module defines overrides, these take precedence
                // this is to allow different editTypes from svg cartesian
                if(_module.layoutAttrOverrides) return _module.layoutAttrOverrides;

                // otherwise take the first attributes we find
                if(!out && _module.layoutAttributes) out = _module.layoutAttributes;
            }

            // a module can also override the behavior of base (and component) module layout attrs
            const baseOverrides = _module.baseLayoutAttrOverrides;
            if(baseOverrides && head in baseOverrides) return baseOverrides[head];
        }
        if(out) return out;
    }

    // look for layout attributes contributed by traces on the plot
    const modules = fullLayout._modules;
    if(modules) {
        for(i = 0; i < modules.length; i++) {
            attributes = modules[i].layoutAttributes;
            if(attributes && head in attributes) {
                return attributes[head];
            }
        }
    }

    /*
     * Next look in components.
     * Components that define a schema have already merged this into
     * base and subplot attribute defs, so ignore these.
     * Others (older style) all put all their attributes
     * inside a container matching the module `name`
     * eg `attributes` (array) or `legend` (object)
     */
    for(key in Registry.componentsRegistry) {
        _module = Registry.componentsRegistry[key];
        if(_module.name === 'colorscale' && head.indexOf('coloraxis') === 0) {
            return _module.layoutAttributes[head];
        } else if(!_module.schema && (head === _module.name)) {
            return _module.layoutAttributes;
        }
    }

    if(head in baseLayoutAttributes) return (baseLayoutAttributes as any)[head];

    return false;
}

function recurseIntoValObject(valObject?: any, parts?: any, i?: any): boolean | void {
    if(!valObject) return false;

    if(valObject._isLinkedToArray) {
        // skip array index, abort if we try to dive into an array without an index
        if(isIndex(parts[i])) i++;
        else if(i < parts.length) return false;
    }

    // now recurse as far as we can. Occasionally we have an attribute
    // setting an internal part below what's in the schema; just return
    // the innermost schema item we find.
    for(; i < parts.length; i++) {
        const newValObject = valObject[parts[i]];
        if(isPlainObject(newValObject)) valObject = newValObject;
        else break;

        if(i === parts.length - 1) break;

        if(valObject._isLinkedToArray) {
            i++;
            if(!isIndex(parts[i])) return false;
        } else if(valObject.valType === 'info_array') {
            i++;
            const index = parts[i];
            if(!isIndex(index)) return false;

            const items = valObject.items;
            if(Array.isArray(items)) {
                if(index >= items.length) return false;
                if(valObject.dimensions === 2) {
                    i++;
                    if(parts.length === i) return valObject;
                    const index2 = parts[i];
                    if(!isIndex(index2)) return false;
                    valObject = items[index][index2];
                } else valObject = items[index];
            } else {
                valObject = items;
            }
        }
    }

    return valObject;
}

// note: this is different from Lib.isIndex, this one doesn't accept numeric
// strings, only actual numbers.
function isIndex(val?: any): any {
    return val === Math.round(val) && val >= 0;
}

function getTraceAttributes(type?: any): any {
    let _module, basePlotModule;

    _module = Registry.modules[type]._module,
    basePlotModule = _module.basePlotModule;

    const attributes: any = {};

    // make 'type' the first attribute in the object
    attributes.type = null;

    const copyBaseAttributes = extendDeepAll({}, baseAttributes);
    const copyModuleAttributes = extendDeepAll({}, _module.attributes);

    // prune global-level trace attributes that are already defined in a trace
    crawl(copyModuleAttributes, function(attr: any, attrName: any, attrs: any, level: any, fullAttrString: any) {
        nestedProperty(copyBaseAttributes, fullAttrString).set(undefined);
        // Prune undefined attributes
        if(attr === undefined) nestedProperty(copyModuleAttributes, fullAttrString).set(undefined);
    });

    // base attributes (same for all trace types)
    extendDeepAll(attributes, copyBaseAttributes);

    // prune-out base attributes based on trace module categories
    if(Registry.traceIs(type, 'noOpacity')) {
        delete attributes.opacity;
    }
    if(!Registry.traceIs(type, 'showLegend')) {
        delete attributes.showlegend;
        delete attributes.legendgroup;
    }
    if(Registry.traceIs(type, 'noHover')) {
        delete attributes.hoverinfo;
        delete attributes.hoverlabel;
    }
    if(!_module.selectPoints) {
        delete attributes.selectedpoints;
    }

    // module attributes
    extendDeepAll(attributes, copyModuleAttributes);

    // subplot attributes
    if(basePlotModule.attributes) {
        extendDeepAll(attributes, basePlotModule.attributes);
    }

    // 'type' gets overwritten by baseAttributes; reset it here
    attributes.type = type;

    const out: any = {
        meta: _module.meta || {},
        categories: _module.categories || {},
        animatable: Boolean(_module.animatable),
        type: type,
        attributes: formatAttributes(attributes),
    };

    // trace-specific layout attributes
    if(_module.layoutAttributes) {
        const layoutAttributes: any = {};

        extendDeepAll(layoutAttributes, _module.layoutAttributes);
        out.layoutAttributes = formatAttributes(layoutAttributes);
    }

    // drop anim:true in non-animatable modules
    if(!_module.animatable) {
        crawl(out, function(attr: any) {
            if(isValObject(attr) && 'anim' in attr) {
                delete attr.anim;
            }
        });
    }

    return out;
}

function getLayoutAttributes(): any {
    const layoutAttributes: any = {};
    let key, _module;

    // global layout attributes
    extendDeepAll(layoutAttributes, baseLayoutAttributes);

    // add base plot module layout attributes
    for(key in Registry.subplotsRegistry) {
        _module = Registry.subplotsRegistry[key];

        if(!_module.layoutAttributes) continue;

        if(Array.isArray(_module.attr)) {
            for(let i = 0; i < _module.attr.length; i++) {
                handleBasePlotModule(layoutAttributes, _module, _module.attr[i]);
            }
        } else {
            const astr = _module.attr === 'subplot' ? _module.name : _module.attr;
            handleBasePlotModule(layoutAttributes, _module, astr);
        }
    }

    // add registered components layout attributes
    for(key in Registry.componentsRegistry) {
        _module = Registry.componentsRegistry[key];
        const schema = _module.schema;

        if(schema && (schema.subplots || schema.layout)) {
            /*
             * Components with defined schema have already been merged in at register time
             * but a few components define attributes that apply only to xaxis
             * not yaxis (rangeselector, rangeslider) - delete from y schema.
             * Note that the input attributes for xaxis/yaxis are the same object
             * so it's not possible to only add them to xaxis from the start.
             * If we ever have such asymmetry the other way, or anywhere else,
             * we will need to extend both this code and mergeComponentAttrsToSubplot
             * (which will not find yaxis only for example)
             */
            const subplots = schema.subplots;
            if(subplots && subplots.xaxis && !subplots.yaxis) {
                for(const xkey in subplots.xaxis) {
                    delete layoutAttributes.yaxis[xkey];
                }
            }

            /*
             * Also some attributes e.g. shift & autoshift only implemented on the yaxis
             * at the moment. Remove them from the xaxis.
            */
            delete layoutAttributes.xaxis.shift;
            delete layoutAttributes.xaxis.autoshift;
        } else if(_module.name === 'colorscale') {
            extendDeepAll(layoutAttributes, _module.layoutAttributes);
        } else if(_module.layoutAttributes) {
            // older style without schema need to be explicitly merged in now
            insertAttrs(layoutAttributes, _module.layoutAttributes, _module.name);
        }
    }

    return {
        layoutAttributes: formatAttributes(layoutAttributes)
    };
}

function getFramesAttributes(): any {
    const attrs: any = {
        frames: extendDeepAll({}, frameAttributes)
    };

    formatAttributes(attrs);

    return attrs.frames;
}

function formatAttributes(attrs?: any): any {
    mergeValTypeAndRole(attrs);
    formatArrayContainers(attrs);
    stringify(attrs);

    return attrs;
}

function mergeValTypeAndRole(attrs?: any): void {
    function makeSrcAttr(attrName?: any) {
        return {
            valType: 'string',
            description: 'Sets the source reference on Chart Studio Cloud for `' + attrName + '`.',
            editType: 'none'
        };
    }

    function callback(attr?: any, attrName?: any, attrs?: any) {
        if(isValObject(attr)) {
            if(attr.arrayOk === true || attr.valType === 'data_array') {
                // all 'arrayOk' and 'data_array' attrs have a corresponding 'src' attr
                attrs[attrName + 'src'] = makeSrcAttr(attrName);
            }
        } else if(isPlainObject(attr)) {
            // all attrs container objects get role 'object'
            attr.role = 'object';
        }
    }

    crawl(attrs, callback);
}

function formatArrayContainers(attrs?: any): void {
    function callback(attr?: any, attrName?: any, attrs?: any) {
        if(!attr) return;

        const itemName = attr[IS_LINKED_TO_ARRAY];

        if(!itemName) return;

        delete attr[IS_LINKED_TO_ARRAY];

        attrs[attrName] = { items: {} };
        attrs[attrName].items[itemName] = attr;
        attrs[attrName].role = 'object';
    }

    crawl(attrs, callback);
}

// this can take around 10ms and should only be run from PlotSchema.get(),
// to ensure JSON.stringify(PlotSchema.get()) gives the intended result.
function stringify(attrs?: any): void {
    function walk(attr?: any) {
        for(const k in attr) {
            if(isPlainObject(attr[k])) {
                walk(attr[k]);
            } else if(Array.isArray(attr[k])) {
                for(let i = 0; i < attr[k].length; i++) {
                    walk(attr[k][i]);
                }
            } else {
                // as JSON.stringify(/test/) // => {}
                if(attr[k] instanceof RegExp) {
                    attr[k] = attr[k].toString();
                }
            }
        }
    }

    walk(attrs);
}

function handleBasePlotModule(layoutAttributes?: any, _module?: any, astr?: any): void {
    const np = nestedProperty(layoutAttributes, astr);
    const attrs = extendDeepAll({}, _module.layoutAttributes);

    attrs[IS_SUBPLOT_OBJ] = true;
    np.set(attrs);
}

function insertAttrs(baseAttrs?: any, newAttrs?: any, astr?: any): void {
    const np = nestedProperty(baseAttrs, astr);

    np.set(extendDeepAll(np.get() || {}, newAttrs));
}

export default { get, crawl, isValObject, findArrayAttributes, getTraceValObject, getLayoutValObject, IS_SUBPLOT_OBJ, IS_LINKED_TO_ARRAY, DEPRECATED, UNDERSCORE_ATTRS };
