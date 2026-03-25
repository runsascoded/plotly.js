import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function supplyLayoutDefaults(layoutIn, layoutOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    coerce('iciclecolorway', layoutOut.colorway);
    coerce('extendiciclecolors');
}
