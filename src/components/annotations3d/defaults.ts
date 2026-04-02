import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import handleAnnotationCommonDefaults from '../annotations/common_defaults.js';
import attributes from './attributes.js';

export default function handleDefaults(sceneLayoutIn: any, sceneLayoutOut: any, opts: any) {
    handleArrayContainerDefaults(sceneLayoutIn, sceneLayoutOut, {
        name: 'annotations',
        handleItemDefaults: handleAnnotationDefaults,
        fullLayout: opts.fullLayout
    });
}

function handleAnnotationDefaults(annIn: any, annOut: any, sceneLayout: any, opts: any) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(annIn, annOut, attributes, attr, dflt);
    }

    function coercePosition(axLetter: any) {
        const axName = axLetter + 'axis';

        // mock in such way that getFromId grabs correct 3D axis
        const gdMock = { _fullLayout: {} };
        (gdMock._fullLayout as any)[axName] = sceneLayout[axName];

        return Axes.coercePosition(annOut, gdMock, coerce, axLetter, axLetter, 0.5);
    }

    const visible = coerce('visible');
    if(!visible) return;

    handleAnnotationCommonDefaults(annIn, annOut, opts.fullLayout, coerce);

    coercePosition('x');
    coercePosition('y');
    coercePosition('z');

    // if you have one coordinate you should all three
    Lib.noneOrAll(annIn, annOut, ['x', 'y', 'z']);

    // hard-set here for completeness
    annOut.xref = 'x';
    annOut.yref = 'y';
    annOut.zref = 'z';

    coerce('xanchor');
    coerce('yanchor');
    coerce('xshift');
    coerce('yshift');

    if(annOut.showarrow) {
        annOut.axref = 'pixel';
        annOut.ayref = 'pixel';

        // TODO maybe default values should be bigger than the 2D case?
        coerce('ax', -10);
        coerce('ay', -30);

        // if you have one part of arrow length you should have both
        Lib.noneOrAll(annIn, annOut, ['ax', 'ay']);
    }
}
