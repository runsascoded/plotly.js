import { extendFlat } from '../../lib/extend.js';
import colorScaleAttrs from './attributes.js';
import _scales from './scales.js';
const { scales } = _scales;

const msg = 'Note that `autocolorscale` must be true for this attribute to work.';

export default {
    editType: 'calc',

    colorscale: {
        editType: 'calc',

        sequential: {
            valType: 'colorscale',
            dflt: scales.Reds,
            editType: 'calc',
            description: [
                'Sets the default sequential colorscale for positive values.',
                msg
            ].join(' ')
        },
        sequentialminus: {
            valType: 'colorscale',
            dflt: scales.Blues,
            editType: 'calc',
            description: [
                'Sets the default sequential colorscale for negative values.',
                msg
            ].join(' ')
        },
        diverging: {
            valType: 'colorscale',
            dflt: scales.RdBu,
            editType: 'calc',
            description: [
                'Sets the default diverging colorscale.',
                msg
            ].join(' ')
        }
    },

    coloraxis: extendFlat({
        _isSubplotObj: true,
        editType: 'calc',
        description: [
            ''
        ].join(' ')
    }, colorScaleAttrs('', {
        colorAttr: 'corresponding trace color array(s)',
        noColorAxis: true,
        showScaleDflt: true
    }))
};
