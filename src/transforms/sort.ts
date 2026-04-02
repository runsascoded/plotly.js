import Lib from '../lib/index.js';
import Axes from '../plots/cartesian/axes.js';
import { pointsAccessorFunction } from './helpers.js';
import _numerical from '../constants/numerical.js';
const { BADNUM } = _numerical;
export const moduleType = 'transform';
export const name = 'sort';

export const attributes = {
    enabled: {
        valType: 'boolean',
        dflt: true,
        editType: 'calc',
        description: [
            'Determines whether this sort transform is enabled or disabled.'
        ].join(' ')
    },
    target: {
        valType: 'string',
        strict: true,
        noBlank: true,
        arrayOk: true,
        dflt: 'x',
        editType: 'calc',
        description: [
            'Sets the target by which the sort transform is applied.',

            'If a string, *target* is assumed to be a reference to a data array',
            'in the parent trace object.',
            'To sort about nested variables, use *.* to access them.',
            'For example, set `target` to *marker.size* to sort',
            'about the marker size array.',

            'If an array, *target* is then the data array by which',
            'the sort transform is applied.'
        ].join(' ')
    },
    order: {
        valType: 'enumerated',
        values: ['ascending', 'descending'],
        dflt: 'ascending',
        editType: 'calc',
        description: [
            'Sets the sort transform order.'
        ].join(' ')
    },
    editType: 'calc'
};

export const supplyDefaults = function(transformIn) {
    const transformOut = {};

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(transformIn, transformOut, attributes, attr, dflt);
    }

    const enabled = coerce('enabled');

    if(enabled) {
        coerce('target');
        coerce('order');
    }

    return transformOut;
};

export const calcTransform = function(gd, trace, opts) {
    if(!opts.enabled) return;

    const targetArray = Lib.getTargetArray(trace, opts);
    if(!targetArray) return;

    const target = opts.target;

    let len = targetArray.length;
    if(trace._length) len = Math.min(len, trace._length);

    const arrayAttrs = trace._arrayAttrs;
    const d2c = Axes.getDataToCoordFunc(gd, trace, target, targetArray);
    const indices = getIndices(opts, targetArray, d2c, len);
    const originalPointsAccessor = pointsAccessorFunction(trace.transforms, opts);
    const indexToPoints: any = {};
    let i, j;

    for(i = 0; i < arrayAttrs.length; i++) {
        const np = Lib.nestedProperty(trace, arrayAttrs[i]);
        const arrayOld = np.get();
        const arrayNew = new Array(len);

        for(j = 0; j < len; j++) {
            arrayNew[j] = arrayOld[indices[j]];
        }

        np.set(arrayNew);
    }

    for(j = 0; j < len; j++) {
        indexToPoints[j] = originalPointsAccessor(indices[j]);
    }

    opts._indexToPoints = indexToPoints;
    trace._length = len;
};

function getIndices(opts, targetArray, d2c, len) {
    const sortedArray = new Array(len);
    const indices = new Array(len);
    let i;

    for(i = 0; i < len; i++) {
        sortedArray[i] = {v: targetArray[i], i: i};
    }

    sortedArray.sort(getSortFunc(opts, d2c));

    for(i = 0; i < len; i++) {
        indices[i] = sortedArray[i].i;
    }

    return indices;
}

function getSortFunc(opts, d2c) {
    switch(opts.order) {
        case 'ascending':
            return function(a, b) {
                const ac = d2c(a.v);
                const bc = d2c(b.v);
                if(ac === BADNUM) {
                    return 1;
                }
                if(bc === BADNUM) {
                    return -1;
                }
                return ac - bc;
            };
        case 'descending':
            return function(a, b) {
                const ac = d2c(a.v);
                const bc = d2c(b.v);
                if(ac === BADNUM) {
                    return 1;
                }
                if(bc === BADNUM) {
                    return -1;
                }
                return bc - ac;
            };
    }
}

export default { moduleType, name, attributes, supplyDefaults, calcTransform };
