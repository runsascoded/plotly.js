import Lib from '../../lib/index.js';
import _index from '../../components/color/index.js';
const { defaultLine } = _index;
import { attributes as domainAttrs } from '../domain.js';
import fontAttrs from '../font_attributes.js';
import _attributes from '../../traces/scatter/attributes.js';
const { textposition } = _attributes;
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import { templatedArray } from '../../plot_api/plot_template.js';
import constants from './constants.js';

var fontAttr = fontAttrs({
    noFontVariant: true,
    noFontShadow: true,
    noFontLineposition: true,
    noFontTextcase: true,
    description: [
        'Sets the icon text font (color=map.layer.paint.text-color, size=map.layer.layout.text-size).',
        'Has an effect only when `type` is set to *symbol*.'
    ].join(' ')
});
fontAttr.family.dflt = 'Open Sans Regular, Arial Unicode MS Regular';

var attrs = {};

// set uirevision outside of overrideAll so it can be `editType: 'none'`
attrs.uirevision = {
    valType: 'any',
    editType: 'none',
    description: [
        'Controls persistence of user-driven changes in the view:',
        '`center`, `zoom`, `bearing`, `pitch`. Defaults to `layout.uirevision`.'
    ].join(' ')
};

export default attrs;
