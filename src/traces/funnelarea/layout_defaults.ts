import type { FullLayout } from '../../../types/core';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function supplyLayoutDefaults(layoutIn: any,  layoutOut: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    coerce('hiddenlabels');
    coerce('funnelareacolorway', layoutOut.colorway);
    coerce('extendfunnelareacolors');
}
