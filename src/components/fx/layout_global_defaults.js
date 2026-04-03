import Lib from '../../lib/index.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';
import layoutAttributes from './layout_attributes.js';
export default function supplyLayoutGlobalDefaults(layoutIn, layoutOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    handleHoverLabelDefaults(layoutIn, layoutOut, coerce);
}
