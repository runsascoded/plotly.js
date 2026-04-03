import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
const name = 'images';
export default function supplyLayoutDefaults(layoutIn, layoutOut) {
    const opts = {
        name: name,
        handleItemDefaults: imageDefaults
    };
    handleArrayContainerDefaults(layoutIn, layoutOut, opts);
}
function imageDefaults(imageIn, imageOut, fullLayout) {
    function coerce(attr, dflt) {
        return Lib.coerce(imageIn, imageOut, attributes, attr, dflt);
    }
    const source = coerce('source');
    const visible = coerce('visible', !!source);
    if (!visible)
        return imageOut;
    coerce('layer');
    coerce('xanchor');
    coerce('yanchor');
    coerce('sizex');
    coerce('sizey');
    coerce('sizing');
    coerce('opacity');
    const gdMock = { _fullLayout: fullLayout };
    const axLetters = ['x', 'y'];
    for (let i = 0; i < 2; i++) {
        // 'paper' is the fallback axref
        const axLetter = axLetters[i];
        const axRef = Axes.coerceRef(imageIn, imageOut, gdMock, axLetter, 'paper', undefined);
        if (axRef !== 'paper') {
            const ax = Axes.getFromId(gdMock, axRef);
            ax._imgIndices.push(imageOut._index);
        }
        Axes.coercePosition(imageOut, gdMock, coerce, axRef, axLetter, 0);
    }
    return imageOut;
}
