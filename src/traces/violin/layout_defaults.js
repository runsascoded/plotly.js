import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
import boxLayoutDefaults from '../box/layout_defaults.js';
export default function supplyLayoutDefaults(layoutIn, layoutOut, fullData) {
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    boxLayoutDefaults._supply(layoutIn, layoutOut, fullData, coerce, 'violin');
}
