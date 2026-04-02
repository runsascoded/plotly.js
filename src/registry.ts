import Loggers from './lib/loggers.js';
import noop from './lib/noop.js';
import pushUnique from './lib/push_unique.js';
import isPlainObject from './lib/is_plain_object.js';
import _dom from './lib/dom.js';
const { addStyleRule } = _dom;
import ExtendModule from './lib/extend.js';
import basePlotAttributes from './plots/attributes.js';
import baseLayoutAttributes from './plots/layout_attributes.js';
import 'maplibre-gl/dist/maplibre-gl.css';

const extendFlat = ExtendModule.extendFlat;
const extendDeepAll = ExtendModule.extendDeepAll;

export const modules: Record<string, any> = {};
export const allCategories: Record<string, any> = {};
export const allTypes: string[] = [];
export const subplotsRegistry: Record<string, any> = {};
export const componentsRegistry: Record<string, any> = {};
export const layoutArrayContainers: string[] = [];
export const layoutArrayRegexes: RegExp[] = [];
export const traceLayoutAttributes: Record<string, any> = {};
export const localeRegistry: Record<string, any> = {};
export const apiMethodRegistry: Record<string, any> = {};
export let collectableSubplotTypes: string[] | null = null;

export const register = function register(_modules) {
    collectableSubplotTypes = null;

    if(!_modules) {
        throw new Error('No argument passed to Plotly.register.');
    } else if(_modules && !Array.isArray(_modules)) {
        _modules = [_modules];
    }

    for(let i = 0; i < _modules.length; i++) {
        const newModule = _modules[i];

        if(!newModule) {
            throw new Error('Invalid module was attempted to be registered!');
        }

        switch(newModule.moduleType) {
            case 'trace':
                registerTraceModule(newModule);
                break;
            case 'transform':
                registerTransformModule(newModule);
                break;
            case 'component':
                registerComponentModule(newModule);
                break;
            case 'locale':
                registerLocale(newModule);
                break;
            case 'apiMethod':
                const name = newModule.name;
                apiMethodRegistry[name] = newModule.fn;
                break;
            default:
                throw new Error('Invalid module was attempted to be registered!');
        }
    }
};

export const getModule = function(trace) {
    const _module = modules[getTraceType(trace)];
    if(!_module) return false;
    return _module._module;
};

export const traceIs = function(traceType, category) {
    traceType = getTraceType(traceType);

    // old Chart Studio Cloud workspace hack, nothing to see here
    if(traceType === 'various') return false;

    let _module = modules[traceType];

    if(!_module) {
        if(traceType) {
            Loggers.log('Unrecognized trace type ' + traceType + '.');
        }

        _module = modules[basePlotAttributes.type.dflt];
    }

    return !!_module.categories[category];
};

export const getComponentMethod = function(name, method) {
    const _module = componentsRegistry[name];

    if(!_module) return noop;
    return _module[method] || noop;
};

export const call = function(..._args: any[]) {
    const name = _args[0];
    const args = _args.slice(1);
    return apiMethodRegistry[name].apply(null, args);
};

function registerTraceModule(_module) {
    const thisType = _module.name;
    const categoriesIn = _module.categories;
    const meta = _module.meta;

    if(modules[thisType]) {
        Loggers.log('Type ' + thisType + ' already registered');
        return;
    }

    if(!subplotsRegistry[_module.basePlotModule.name]) {
        registerSubplot(_module.basePlotModule);
    }

    const categoryObj: any = {};
    for(let i = 0; i < categoriesIn.length; i++) {
        categoryObj[categoriesIn[i]] = true;
        allCategories[categoriesIn[i]] = true;
    }

    modules[thisType] = {
        _module: _module,
        categories: categoryObj
    };

    if(meta && Object.keys(meta).length) {
        modules[thisType].meta = meta;
    }

    allTypes.push(thisType);

    for(const componentName in componentsRegistry) {
        mergeComponentAttrsToTrace(componentName, thisType);
    }

    /*
     * Collect all trace layout attributes in one place for easier lookup later
     * but don't merge them into the base schema as it would confuse the docs
     * (at least after https://github.com/plotly/documentation/issues/202 gets done!)
     */
    if(_module.layoutAttributes) {
        extendFlat(traceLayoutAttributes, _module.layoutAttributes);
    }

    const basePlotModule = _module.basePlotModule;
    const bpmName = basePlotModule.name;

    // add mapbox-gl CSS here to avoid console warning on instantiation
    if(bpmName === 'mapbox') {
        const styleRules = basePlotModule.constants.styleRules;
        for(const k in styleRules) {
            addStyleRule('.js-plotly-plot .plotly .mapboxgl-' + k, styleRules[k]);
        }
    }

    // maplibre-gl CSS is loaded via top-level import

    // if `plotly-geo-assets.js` is not included,
    // add `PlotlyGeoAssets` global to stash references to all fetched
    // topojson / geojson data
    if((bpmName === 'geo' || bpmName === 'mapbox' || bpmName === 'map') &&
        ((window as any).PlotlyGeoAssets === undefined)
    ) {
        (window as any).PlotlyGeoAssets = {topojson: {}};
    }
}

function registerSubplot(_module) {
    const plotType = _module.name;

    if(subplotsRegistry[plotType]) {
        Loggers.log('Plot type ' + plotType + ' already registered.');
        return;
    }

    // relayout array handling will look for component module methods with this
    // name and won't find them because this is a subplot module... but that
    // should be fine, it will just fall back on redrawing the plot.
    findArrayRegexps(_module);

    // not sure what's best for the 'cartesian' type at this point
    subplotsRegistry[plotType] = _module;

    for(const componentName in componentsRegistry) {
        mergeComponentAttrsToSubplot(componentName, _module.name);
    }
}

function registerComponentModule(_module) {
    if(typeof _module.name !== 'string') {
        throw new Error('Component module *name* must be a string.');
    }

    const name = _module.name;
    componentsRegistry[name] = _module;

    if(_module.layoutAttributes) {
        if(_module.layoutAttributes._isLinkedToArray) {
            pushUnique(layoutArrayContainers, name);
        }
        findArrayRegexps(_module);
    }

    for(const traceType in modules) {
        mergeComponentAttrsToTrace(name, traceType);
    }

    for(const subplotName in subplotsRegistry) {
        mergeComponentAttrsToSubplot(name, subplotName);
    }

    if(_module.schema && _module.schema.layout) {
        extendDeepAll(baseLayoutAttributes, _module.schema.layout);
    }
}

function registerTransformModule(_module) {
    if(typeof _module.name !== 'string') {
        throw new Error('Transform module *name* must be a string.');
    }

    const prefix = 'Transform module ' + _module.name;
    const hasTransform = typeof _module.transform === 'function';
    const hasCalcTransform = typeof _module.calcTransform === 'function';

    if(!hasTransform && !hasCalcTransform) {
        throw new Error(prefix + ' is missing a *transform* or *calcTransform* method.');
    }
    if(hasTransform && hasCalcTransform) {
        Loggers.log([
            prefix + ' has both a *transform* and *calcTransform* methods.',
            'Please note that all *transform* methods are executed',
            'before all *calcTransform* methods.'
        ].join(' '));
    }
    if(!isPlainObject(_module.attributes)) {
        Loggers.log(prefix + ' registered without an *attributes* object.');
    }
    if(typeof _module.supplyDefaults !== 'function') {
        Loggers.log(prefix + ' registered without a *supplyDefaults* method.');
    }
}

function registerLocale(_module) {
    const locale = _module.name;
    const baseLocale = locale.split('-')[0];

    const newDict = _module.dictionary;
    const newFormat = _module.format;
    const hasDict = newDict && Object.keys(newDict).length;
    const hasFormat = newFormat && Object.keys(newFormat).length;

    const locales = localeRegistry;

    let localeObj = locales[locale];
    if(!localeObj) locales[locale] = localeObj = {};

    // Should we use this dict for the base locale?
    // In case we're overwriting a previous dict for this locale, check
    // whether the base matches the full locale dict now. If we're not
    // overwriting, locales[locale] is undefined so this just checks if
    // baseLocale already had a dict or not.
    // Same logic for dateFormats
    if(baseLocale !== locale) {
        let baseLocaleObj = locales[baseLocale];
        if(!baseLocaleObj) locales[baseLocale] = baseLocaleObj = {};

        if(hasDict && baseLocaleObj.dictionary === localeObj.dictionary) {
            baseLocaleObj.dictionary = newDict;
        }
        if(hasFormat && baseLocaleObj.format === localeObj.format) {
            baseLocaleObj.format = newFormat;
        }
    }

    if(hasDict) localeObj.dictionary = newDict;
    if(hasFormat) localeObj.format = newFormat;
}

function findArrayRegexps(_module) {
    if(_module.layoutAttributes) {
        const arrayAttrRegexps = _module.layoutAttributes._arrayAttrRegexps;
        if(arrayAttrRegexps) {
            for(let i = 0; i < arrayAttrRegexps.length; i++) {
                pushUnique(layoutArrayRegexes, arrayAttrRegexps[i]);
            }
        }
    }
}

function mergeComponentAttrsToTrace(componentName, traceType) {
    const componentSchema = componentsRegistry[componentName].schema;
    if(!componentSchema || !componentSchema.traces) return;

    const traceAttrs = componentSchema.traces[traceType];
    if(traceAttrs) {
        extendDeepAll(modules[traceType]._module.attributes, traceAttrs);
    }
}

function mergeComponentAttrsToSubplot(componentName, subplotName) {
    const componentSchema = componentsRegistry[componentName].schema;
    if(!componentSchema || !componentSchema.subplots) return;

    const subplotModule = subplotsRegistry[subplotName];
    const subplotAttrs = subplotModule.layoutAttributes;
    let subplotAttr = subplotModule.attr === 'subplot' ? subplotModule.name : subplotModule.attr;
    if(Array.isArray(subplotAttr)) subplotAttr = subplotAttr[0];

    const componentLayoutAttrs = componentSchema.subplots[subplotAttr];
    if(subplotAttrs && componentLayoutAttrs) {
        extendDeepAll(subplotAttrs, componentLayoutAttrs);
    }
}

function getTraceType(traceType) {
    if(typeof traceType === 'object') traceType = traceType.type;
    return traceType;
}

export default { modules, allCategories, allTypes, subplotsRegistry, componentsRegistry, layoutArrayContainers, layoutArrayRegexes, traceLayoutAttributes, localeRegistry, apiMethodRegistry, collectableSubplotTypes, register, getModule, traceIs, getComponentMethod, call };
