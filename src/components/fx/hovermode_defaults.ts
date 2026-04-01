import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
import type { FullLayout } from '../../../types/core';

export default function handleHoverModeDefaults(layoutIn: any, layoutOut: FullLayout): any {
    function coerce(attr: string, dflt?: any): any {
        // don't coerce if it is already coerced in other place e.g. in cartesian defaults
        if(layoutOut[attr] !== undefined) return layoutOut[attr];

        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    coerce('clickmode');
    coerce('hoversubplots');
    return coerce('hovermode');
}
