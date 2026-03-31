import Lib from '../../lib/index.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';
import layoutAttributes from './layout_attributes.js';

export default function supplyLayoutGlobalDefaults(layoutIn: any, layoutOut: any): void {
    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    handleHoverLabelDefaults(layoutIn, layoutOut, coerce);
}
