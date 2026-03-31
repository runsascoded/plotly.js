import type { FullLayout, Layout } from '../../../types/core';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function supplyLayoutDefaults(layoutIn: Layout, layoutOut: FullLayout): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    coerce('hiddenlabels');
    coerce('piecolorway', layoutOut.colorway);
    coerce('extendpiecolors');
}
