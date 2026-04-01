import type { FullLayout, Layout } from '../../../types/core';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function(layoutIn: Layout, layoutOut: FullLayout): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    var groupBarmode = layoutOut.barmode === 'group';

    if(layoutOut.scattermode === 'group') {
        coerce('scattergap', groupBarmode ? layoutOut.bargap : 0.2);
    }
}
