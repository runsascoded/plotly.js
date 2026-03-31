import type { FullLayout } from '../../../types/core';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
var name = 'images';

export default function supplyLayoutDefaults(layoutIn: any, layoutOut: any) {
    var opts = {
        name: name,
        handleItemDefaults: imageDefaults
    };

    handleArrayContainerDefaults(layoutIn, layoutOut, opts);
}

function imageDefaults(imageIn: any, imageOut: any, fullLayout: FullLayout) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(imageIn, imageOut, attributes, attr, dflt);
    }

    var source = coerce('source');
    var visible = coerce('visible', !!source);

    if(!visible) return imageOut;

    coerce('layer');
    coerce('xanchor');
    coerce('yanchor');
    coerce('sizex');
    coerce('sizey');
    coerce('sizing');
    coerce('opacity');

    var gdMock = { _fullLayout: fullLayout };
    var axLetters = ['x', 'y'];

    for(var i = 0; i < 2; i++) {
        // 'paper' is the fallback axref
        var axLetter = axLetters[i];
        var axRef = Axes.coerceRef(imageIn, imageOut, gdMock, axLetter, 'paper', undefined);

        if(axRef !== 'paper') {
            var ax = Axes.getFromId(gdMock, axRef);
            ax._imgIndices.push(imageOut._index);
        }

        Axes.coercePosition(imageOut, gdMock, coerce, axRef, axLetter, 0);
    }

    return imageOut;
}
