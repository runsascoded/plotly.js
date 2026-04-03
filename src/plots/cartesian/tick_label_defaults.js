import Lib, { coerceFont, isPlainObject } from '../../lib/index.js';
import _index from '../../components/color/index.js';
const { contrast } = _index;
import layoutAttributes from './layout_attributes.js';
import getShowAttrDflt from './show_dflt.js';
import handleArrayContainerDefaults from '../array_container_defaults.js';
export default function handleTickLabelDefaults(containerIn, containerOut, coerce, axType, options) {
    if (!options)
        options = {};
    const labelalias = coerce('labelalias');
    if (!isPlainObject(labelalias))
        delete containerOut.labelalias;
    const showAttrDflt = getShowAttrDflt(containerIn);
    const showTickLabels = coerce('showticklabels');
    if (showTickLabels) {
        if (!options.noTicklabelshift) {
            coerce('ticklabelshift');
        }
        if (!options.noTicklabelstandoff) {
            coerce('ticklabelstandoff');
        }
        const font = options.font || {};
        const contColor = containerOut.color;
        const position = containerOut.ticklabelposition || '';
        const dfltFontColor = position.indexOf('inside') !== -1 ?
            contrast(options.bgColor) :
            // as with title.font.color, inherit axis.color only if one was
            // explicitly provided
            (contColor && contColor !== layoutAttributes.color.dflt) ?
                contColor : font.color;
        coerceFont(coerce, 'tickfont', font, { overrideDflt: {
                color: dfltFontColor
            } });
        if (!options.noTicklabelstep &&
            axType !== 'multicategory' &&
            axType !== 'log') {
            coerce('ticklabelstep');
        }
        if (!options.noAng) {
            const tickAngle = coerce('tickangle');
            if (!options.noAutotickangles && tickAngle === 'auto') {
                coerce('autotickangles');
            }
        }
        if (axType !== 'category') {
            const tickFormat = coerce('tickformat');
            handleArrayContainerDefaults(containerIn, containerOut, {
                name: 'tickformatstops',
                inclusionAttr: 'enabled',
                handleItemDefaults: tickformatstopDefaults
            });
            if (!containerOut.tickformatstops.length) {
                delete containerOut.tickformatstops;
            }
            if (!options.noExp && !tickFormat && axType !== 'date') {
                coerce('showexponent', showAttrDflt);
                coerce('exponentformat');
                coerce('minexponent');
                coerce('separatethousands');
            }
        }
        if (!options.noMinorloglabels && axType === 'log') {
            coerce('minorloglabels');
        }
    }
}
function tickformatstopDefaults(valueIn, valueOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(valueIn, valueOut, layoutAttributes.tickformatstops, attr, dflt);
    }
    const enabled = coerce('enabled');
    if (enabled) {
        coerce('dtickrange');
        coerce('value');
    }
}
