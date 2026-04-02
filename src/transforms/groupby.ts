import Lib from '../lib/index.js';
import PlotSchema from '../plot_api/plot_schema.js';
import Plots from '../plots/plots.js';
import { pointsAccessorFunction } from './helpers.js';
export const moduleType = 'transform';
export const name = 'groupby';

export const attributes = {
    enabled: {
        valType: 'boolean',
        dflt: true,
        editType: 'calc',
        description: [
            'Determines whether this group-by transform is enabled or disabled.'
        ].join(' ')
    },
    groups: {
        valType: 'data_array',
        dflt: [],
        editType: 'calc',
        description: [
            'Sets the groups in which the trace data will be split.',
            'For example, with `x` set to *[1, 2, 3, 4]* and',
            '`groups` set to *[\'a\', \'b\', \'a\', \'b\']*,',
            'the groupby transform with split in one trace',
            'with `x` [1, 3] and one trace with `x` [2, 4].'
        ].join(' ')
    },
    nameformat: {
        valType: 'string',
        editType: 'calc',
        description: [
            'Pattern by which grouped traces are named. If only one trace is present,',
            'defaults to the group name (`"%{group}"`), otherwise defaults to the group name',
            'with trace name (`"%{group} (%{trace})"`). Available escape sequences are `%{group}`, which',
            'inserts the group name, and `%{trace}`, which inserts the trace name. If grouping',
            'GDP data by country when more than one trace is present, for example, the',
            'default "%{group} (%{trace})" would return "Monaco (GDP per capita)".'
        ].join(' ')
    },
    styles: {
        _isLinkedToArray: 'style',
        target: {
            valType: 'string',
            editType: 'calc',
            description: [
                'The group value which receives these styles.'
            ].join(' ')
        },
        value: {
            valType: 'any',
            dflt: {},
            editType: 'calc',
            description: [
                'Sets each group styles.',
                'For example, with `groups` set to *[\'a\', \'b\', \'a\', \'b\']*',
                'and `styles` set to *[{target: \'a\', value: { marker: { color: \'red\' } }}]',
                'marker points in group *\'a\'* will be drawn in red.'
            ].join(' '),
            _compareAsJSON: true
        },
        editType: 'calc'
    },
    editType: 'calc'
};

export const supplyDefaults = function(transformIn: any, traceOut: any, layout: any) {
    let i;
    const transformOut: any = {};

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(transformIn, transformOut, attributes, attr, dflt);
    }

    const enabled = coerce('enabled');

    if(!enabled) return transformOut;

    coerce('groups');
    coerce('nameformat', layout._dataLength > 1 ? '%{group} (%{trace})' : '%{group}');

    const styleIn = transformIn.styles;
    const styleOut = transformOut.styles = [] as any[];

    if(styleIn) {
        for(i = 0; i < styleIn.length; i++) {
            const thisStyle: any = styleOut[i] = ({} as any);
            Lib.coerce(styleIn[i], styleOut[i], attributes.styles, 'target');
            const value = Lib.coerce(styleIn[i], styleOut[i], attributes.styles, 'value');

            // so that you can edit value in place and have Plotly.react notice it, or
            // rebuild it every time and have Plotly.react NOT think it changed:
            // use _compareAsJSON to say we should diff the _JSON_value
            if(Lib.isPlainObject(value)) thisStyle.value = Lib.extendDeep({}, value);
            else if(value) delete thisStyle.value;
        }
    }

    return transformOut;
};

export const transform = function(data: any, state: any) {
    let newTraces, i, j;
    const newData: any[] = [];

    for(i = 0; i < data.length; i++) {
        newTraces = transformOne(data[i], state);

        for(j = 0; j < newTraces.length; j++) {
            newData.push(newTraces[j]);
        }
    }

    return newData;
};

function transformOne(trace: any, state: any) {
    let i, j, k, attr, srcArray, groupName, newTrace, transforms, arrayLookup;
    let groupNameObj;

    const opts = state.transform;
    const transformIndex = state.transformIndex;
    const groups = trace.transforms[transformIndex].groups;
    const originalPointsAccessor = pointsAccessorFunction(trace.transforms, opts);

    if(!(Lib.isArrayOrTypedArray(groups)) || groups.length === 0) {
        return [trace];
    }

    const groupNames = Lib.filterUnique(groups);
    const newData = new Array(groupNames.length);
    const len = groups.length;

    const arrayAttrs = PlotSchema.findArrayAttributes(trace);

    const styles = opts.styles || [];
    const styleLookup: any = {};
    for(i = 0; i < styles.length; i++) {
        styleLookup[styles[i].target] = styles[i].value;
    }

    if(opts.styles) {
        groupNameObj = Lib.keyedContainer(opts, 'styles', 'target', 'value.name');
    }

    // An index to map group name --> expanded trace index
    const indexLookup: any = {};
    const indexCnts: any = {};

    for(i = 0; i < groupNames.length; i++) {
        groupName = groupNames[i];
        indexLookup[groupName] = i;
        indexCnts[groupName] = 0;

        // Start with a deep extend that just copies array references.
        newTrace = newData[i] = Lib.extendDeepNoArrays({}, trace);
        newTrace._group = groupName;
        newTrace.transforms[transformIndex]._indexToPoints = {};

        let suppliedName = null;
        if(groupNameObj) {
            suppliedName = groupNameObj.get(groupName);
        }

        if(suppliedName || suppliedName === '') {
            newTrace.name = suppliedName;
        } else {
            newTrace.name = Lib.templateString(opts.nameformat, {
                trace: trace.name,
                group: groupName
            });
        }

        // In order for groups to apply correctly to other transform data (e.g.
        // a filter transform), we have to break the connection and clone the
        // transforms so that each group writes grouped values into a different
        // destination. This function does not break the array reference
        // connection between the split transforms it creates. That's handled in
        // initialize, which creates a new empty array for each arrayAttr.
        transforms = newTrace.transforms;
        newTrace.transforms = [];
        for(j = 0; j < transforms.length; j++) {
            newTrace.transforms[j] = Lib.extendDeepNoArrays({}, transforms[j]);
        }

        // Initialize empty arrays for the arrayAttrs, to be split in the next step
        for(j = 0; j < arrayAttrs.length; j++) {
            Lib.nestedProperty(newTrace, arrayAttrs[j]).set([]);
        }
    }

    // For each array attribute including those nested inside this and other
    // transforms (small note that we technically only need to do this for
    // transforms that have not yet been applied):
    for(k = 0; k < arrayAttrs.length; k++) {
        attr = arrayAttrs[k];

        // Cache all the arrays to which we'll push:
        for(j = 0, arrayLookup = []; j < groupNames.length; j++) {
            arrayLookup[j] = Lib.nestedProperty(newData[j], attr).get();
        }

        // Get the input data:
        srcArray = Lib.nestedProperty(trace, attr).get();

        // Send each data point to the appropriate expanded trace:
        for(j = 0; j < len; j++) {
            // Map group data --> trace index --> array and push data onto it
            arrayLookup[indexLookup[groups[j]]].push(srcArray[j]);
        }
    }

    for(j = 0; j < len; j++) {
        newTrace = newData[indexLookup[groups[j]]];

        const indexToPoints = newTrace.transforms[transformIndex]._indexToPoints;
        indexToPoints[indexCnts[groups[j]]] = originalPointsAccessor(j);
        indexCnts[groups[j]]++;
    }

    for(i = 0; i < groupNames.length; i++) {
        groupName = groupNames[i];
        newTrace = newData[i];

        Plots.clearExpandedTraceDefaultColors(newTrace);

        // there's no need to coerce styleLookup[groupName] here
        // as another round of supplyDefaults is done on the transformed traces
        newTrace = Lib.extendDeepNoArrays(newTrace, styleLookup[groupName] || {});
    }

    return newData;
}

export default { moduleType, name, attributes, supplyDefaults, transform };
