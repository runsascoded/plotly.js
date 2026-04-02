import Lib from '../lib/index.js';
import PlotSchema from './plot_schema.js';
import Plots from '../plots/plots.js';
import plotAttributes from '../plots/attributes.js';
import Template from './plot_template.js';
import _plot_config from './plot_config.js';
const { dfltConfig } = _plot_config;
const isPlainObject = Lib.isPlainObject;

export const makeTemplate = function(figure?: any): any {
    figure = Lib.isPlainObject(figure) ? figure : Lib.getGraphDiv(figure);
    figure = Lib.extendDeep({_context: dfltConfig}, {data: figure.data, layout: figure.layout});
    Plots.supplyDefaults(figure);
    const data = figure.data || [];
    const layout: any = figure.layout || {};
    // copy over a few items to help follow the schema
    layout._basePlotModules = figure._fullLayout._basePlotModules;
    layout._modules = figure._fullLayout._modules;

    const template: any = {
        data: {},
        layout: {}
    };

    /*
     * Note: we do NOT validate template values, we just take what's in the
     * user inputs data and layout, not the validated values in fullData and
     * fullLayout. Even if we were to validate here, there's no guarantee that
     * these values would still be valid when applied to a new figure, which
     * may contain different trace modes, different axes, etc. So it's
     * important that when applying a template we still validate the template
     * values, rather than just using them as defaults.
     */

    data.forEach((trace: any) => {
        // TODO: What if no style info is extracted for this trace. We may
        // not want an empty object as the null value.
        // TODO: allow transforms to contribute to templates?
        // as it stands they are ignored, which may be for the best...

        const traceTemplate = {};
        walkStyleKeys(trace, traceTemplate, getTraceInfo.bind(null, trace));

        const traceType = Lib.coerce(trace, {}, plotAttributes, 'type');
        let typeTemplates = template.data[traceType];
        if(!typeTemplates) typeTemplates = template.data[traceType] = [];
        typeTemplates.push(traceTemplate);
    });

    walkStyleKeys(layout, template.layout, getLayoutInfo.bind(null, layout));

    /*
     * Compose the new template with an existing one to the same effect
     *
     * NOTE: there's a possibility of slightly different behavior: if the plot
     * has an invalid value and the old template has a valid value for the same
     * attribute, the plot will use the old template value but this routine
     * will pull the invalid value (resulting in the original default).
     * In the general case it's not possible to solve this with a single value,
     * since valid options can be context-dependent. It could be solved with
     * a *list* of values, but that would be huge complexity for little gain.
     */
    delete template.layout.template;
    const oldTemplate = layout.template;
    if(isPlainObject(oldTemplate)) {
        const oldLayoutTemplate = oldTemplate.layout;

        let i, traceType, oldTypeTemplates, oldTypeLen, typeTemplates, typeLen;

        if(isPlainObject(oldLayoutTemplate)) {
            mergeTemplates(oldLayoutTemplate, template.layout);
        }
        const oldDataTemplate = oldTemplate.data;
        if(isPlainObject(oldDataTemplate)) {
            for(traceType in template.data) {
                oldTypeTemplates = oldDataTemplate[traceType];
                if(Array.isArray(oldTypeTemplates)) {
                    typeTemplates = template.data[traceType];
                    typeLen = typeTemplates.length;
                    oldTypeLen = oldTypeTemplates.length;
                    for(i = 0; i < typeLen; i++) {
                        mergeTemplates(oldTypeTemplates[i % oldTypeLen], typeTemplates[i]);
                    }
                    for(i = typeLen; i < oldTypeLen; i++) {
                        typeTemplates.push(Lib.extendDeep({}, oldTypeTemplates[i]));
                    }
                }
            }
            for(traceType in oldDataTemplate) {
                if(!(traceType in template.data)) {
                    template.data[traceType] = Lib.extendDeep([], oldDataTemplate[traceType]);
                }
            }
        }
    }

    return template;
};

function mergeTemplates(oldTemplate?: any, newTemplate?: any): any {
    // we don't care about speed here, just make sure we have a totally
    // distinct object from the previous template
    oldTemplate = Lib.extendDeep({}, oldTemplate);

    // sort keys so we always get annotationdefaults before annotations etc
    // so arrayTemplater will work right
    const oldKeys = Object.keys(oldTemplate).sort();
    let i, j;

    function mergeOne(oldVal?: any, newVal?: any, key?: any) {
        if(isPlainObject(newVal) && isPlainObject(oldVal)) {
            mergeTemplates(oldVal, newVal);
        } else if(Array.isArray(newVal) && Array.isArray(oldVal)) {
            // Note: omitted `inclusionAttr` from arrayTemplater here,
            // it's irrelevant as we only want the resulting `_template`.
            const templater = Template.arrayTemplater({_template: oldTemplate}, key);
            for(j = 0; j < newVal.length; j++) {
                const item = newVal[j];
                const oldItem = templater.newItem(item)._template;
                if(oldItem) mergeTemplates(oldItem, item);
            }
            const defaultItems = templater.defaultItems();
            for(j = 0; j < defaultItems.length; j++) newVal.push(defaultItems[j]._template);

            // templateitemname only applies to receiving plots
            for(j = 0; j < newVal.length; j++) delete newVal[j].templateitemname;
        }
    }

    for(i = 0; i < oldKeys.length; i++) {
        const key = oldKeys[i];
        const oldVal = oldTemplate[key];
        if(key in newTemplate) {
            mergeOne(oldVal, newTemplate[key], key);
        } else newTemplate[key] = oldVal;

        // if this is a base key from the old template (eg xaxis), look for
        // extended keys (eg xaxis2) in the new template to merge into
        if(getBaseKey(key) === key) {
            for(const key2 in newTemplate) {
                const baseKey2 = getBaseKey(key2);
                if(key2 !== baseKey2 && baseKey2 === key && !(key2 in oldTemplate)) {
                    mergeOne(oldVal, newTemplate[key2], key);
                }
            }
        }
    }
}

function getBaseKey(key?: any): any {
    return key.replace(/[0-9]+$/, '');
}

function walkStyleKeys(parent?: any, templateOut?: any, getAttributeInfo?: any, path?: any, basePath?: any): void {
    const pathAttr = basePath && getAttributeInfo(basePath);
    for(const key in parent) {
        const child = parent[key];
        const nextPath = getNextPath(parent, key, path);
        let nextBasePath = getNextPath(parent, key, basePath);
        let attr: any = getAttributeInfo(nextBasePath);
        if(!attr) {
            const baseKey = getBaseKey(key);
            if(baseKey !== key) {
                nextBasePath = getNextPath(parent, baseKey, basePath);
                attr = getAttributeInfo(nextBasePath);
            }
        }

        // we'll get an attr if path starts with a valid part, then has an
        // invalid ending. Make sure we got all the way to the end.
        if(pathAttr && (pathAttr === attr)) continue;

        if(!attr || attr._noTemplating ||
            attr.valType === 'data_array' ||
            (attr.arrayOk && Array.isArray(child))
        ) {
            continue;
        }

        if(!attr.valType && isPlainObject(child)) {
            walkStyleKeys(child, templateOut, getAttributeInfo, nextPath, nextBasePath);
        } else if(attr._isLinkedToArray && Array.isArray(child)) {
            let dfltDone = false;
            let namedIndex = 0;
            const usedNames: any = {};
            for(let i = 0; i < child.length; i++) {
                const item = child[i];
                if(isPlainObject(item)) {
                    const name = item.name;
                    if(name) {
                        if(!usedNames[name]) {
                            // named array items: allow all attributes except data arrays
                            walkStyleKeys(item, templateOut, getAttributeInfo,
                                getNextPath(child, namedIndex, nextPath),
                                getNextPath(child, namedIndex, nextBasePath));
                            namedIndex++;
                            usedNames[name] = 1;
                        }
                    } else if(!dfltDone) {
                        const dfltKey = Template.arrayDefaultKey(key);
                        const dfltPath = getNextPath(parent, dfltKey, path);

                        // getAttributeInfo will fail if we try to use dfltKey directly.
                        // Instead put this item into the next array element, then
                        // pull it out and move it to dfltKey.
                        const pathInArray = getNextPath(child, namedIndex, nextPath);
                        walkStyleKeys(item, templateOut, getAttributeInfo, pathInArray,
                            getNextPath(child, namedIndex, nextBasePath));
                        const itemPropInArray = Lib.nestedProperty(templateOut, pathInArray);
                        const dfltProp = Lib.nestedProperty(templateOut, dfltPath);
                        dfltProp.set(itemPropInArray.get());
                        itemPropInArray.set(null);

                        dfltDone = true;
                    }
                }
            }
        } else {
            const templateProp = Lib.nestedProperty(templateOut, nextPath);
            templateProp.set(child);
        }
    }
}

function getLayoutInfo(layout?: any, path?: any): any {
    return PlotSchema.getLayoutValObject(
        layout, Lib.nestedProperty({}, path).parts
    );
}

function getTraceInfo(trace?: any, path?: any): any {
    return PlotSchema.getTraceValObject(
        trace, Lib.nestedProperty({}, path).parts
    );
}

function getNextPath(parent?: any, key?: any, path?: any): any {
    let nextPath;
    if(!path) nextPath = key;
    else if(Array.isArray(parent)) nextPath = path + '[' + key + ']';
    else nextPath = path + '.' + key;

    return nextPath;
}

export const validateTemplate = function(figureIn?: any, template?: any): any {
    const figure: any = Lib.extendDeep({}, {
        _context: dfltConfig,
        data: figureIn.data,
        layout: figureIn.layout
    });
    const layout: any = figure.layout || {};
    if(!isPlainObject(template)) template = layout.template || {};
    const layoutTemplate = template.layout;
    const dataTemplate = template.data;
    const errorList: any[] = [];

    figure.layout = layout;
    figure.layout.template = template;
    Plots.supplyDefaults(figure);

    const fullLayout = figure._fullLayout;
    const fullData = figure._fullData;

    const layoutPaths: any = {};
    function crawlLayoutForContainers(obj?: any, paths?: any) {
        for(const key in obj) {
            if(key.charAt(0) !== '_' && isPlainObject(obj[key])) {
                const baseKey = getBaseKey(key);
                const nextPaths: any[] = [];
                let i;
                for(i = 0; i < paths.length; i++) {
                    nextPaths.push(getNextPath(obj, key, paths[i]));
                    if(baseKey !== key) nextPaths.push(getNextPath(obj, baseKey, paths[i]));
                }
                for(i = 0; i < nextPaths.length; i++) {
                    layoutPaths[nextPaths[i]] = 1;
                }
                crawlLayoutForContainers(obj[key], nextPaths);
            }
        }
    }

    function crawlLayoutTemplateForContainers(obj?: any, path?: any) {
        for(const key in obj) {
            if(key.indexOf('defaults') === -1 && isPlainObject(obj[key])) {
                const nextPath = getNextPath(obj, key, path);
                if(layoutPaths[nextPath]) {
                    crawlLayoutTemplateForContainers(obj[key], nextPath);
                } else {
                    errorList.push({code: 'unused', path: nextPath});
                }
            }
        }
    }

    if(!isPlainObject(layoutTemplate)) {
        errorList.push({code: 'layout'});
    } else {
        crawlLayoutForContainers(fullLayout, ['layout']);
        crawlLayoutTemplateForContainers(layoutTemplate, 'layout');
    }

    if(!isPlainObject(dataTemplate)) {
        errorList.push({code: 'data'});
    } else {
        const typeCount: any = {};
        let traceType;
        for(let i = 0; i < fullData.length; i++) {
            const fullTrace = fullData[i];
            traceType = fullTrace.type;
            typeCount[traceType] = (typeCount[traceType] || 0) + 1;
            if(!fullTrace._fullInput._template) {
                // this takes care of the case of traceType in the data but not
                // the template
                errorList.push({
                    code: 'missing',
                    index: fullTrace.index,
                    traceType: traceType
                });
            }
        }
        for(traceType in dataTemplate) {
            const templateCount = dataTemplate[traceType].length;
            const dataCount = typeCount[traceType] || 0;
            if(templateCount > dataCount) {
                errorList.push({
                    code: 'unused',
                    traceType: traceType,
                    templateCount: templateCount,
                    dataCount: dataCount
                });
            } else if(dataCount > templateCount) {
                errorList.push({
                    code: 'reused',
                    traceType: traceType,
                    templateCount: templateCount,
                    dataCount: dataCount
                });
            }
        }
    }

    // _template: false is when someone tried to modify an array item
    // but there was no template with matching name
    function crawlForMissingTemplates(obj?: any, path?: any) {
        for(const key in obj) {
            if(key.charAt(0) === '_') continue;
            const val: any = obj[key];
            const nextPath = getNextPath(obj, key, path);
            if(isPlainObject(val)) {
                if(Array.isArray(obj) && val._template === false && val.templateitemname) {
                    errorList.push({
                        code: 'missing',
                        path: nextPath,
                        templateitemname: val.templateitemname
                    });
                }
                crawlForMissingTemplates(val, nextPath);
            } else if(Array.isArray(val) && hasPlainObject(val)) {
                crawlForMissingTemplates(val, nextPath);
            }
        }
    }
    crawlForMissingTemplates({data: fullData, layout: fullLayout}, '');

    if(errorList.length) return errorList.map(format);
};

function hasPlainObject(arr?: any): any {
    for(let i = 0; i < arr.length; i++) {
        if(isPlainObject(arr[i])) return true;
    }
}

function format(opts?: any): any {
    let msg;
    switch(opts.code) {
        case 'data':
            msg = 'The template has no key data.';
            break;
        case 'layout':
            msg = 'The template has no key layout.';
            break;
        case 'missing':
            if(opts.path) {
                msg = 'There are no templates for item ' + opts.path +
                    ' with name ' + opts.templateitemname;
            } else {
                msg = 'There are no templates for trace ' + opts.index +
                    ', of type ' + opts.traceType + '.';
            }
            break;
        case 'unused':
            if(opts.path) {
                msg = 'The template item at ' + opts.path +
                    ' was not used in constructing the plot.';
            } else if(opts.dataCount) {
                msg = 'Some of the templates of type ' + opts.traceType +
                    ' were not used. The template has ' + opts.templateCount +
                    ' traces, the data only has ' + opts.dataCount +
                    ' of this type.';
            } else {
                msg = 'The template has ' + opts.templateCount +
                    ' traces of type ' + opts.traceType +
                    ' but there are none in the data.';
            }
            break;
        case 'reused':
            msg = 'Some of the templates of type ' + opts.traceType +
                ' were used more than once. The template has ' +
                opts.templateCount + ' traces, the data has ' +
                opts.dataCount + ' of this type.';
            break;
    }
    opts.msg = msg;

    return opts;
}

export default { makeTemplate, validateTemplate };
