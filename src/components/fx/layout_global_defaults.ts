import Lib from '../../lib/index.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';
import layoutAttributes from './layout_attributes.js';
import type { FullLayout } from '../../../types/core';

export default function supplyLayoutGlobalDefaults(layoutIn: any, layoutOut: FullLayout): void {
    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    handleHoverLabelDefaults(layoutIn, layoutOut, coerce);
}
