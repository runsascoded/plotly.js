import type { FullLayout, FullTrace, Layout } from '../../../types/core';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
import boxLayoutDefaults from '../box/layout_defaults.js';

export default function supplyLayoutDefaults(layoutIn: Layout, layoutOut: FullLayout, fullData: FullTrace[]): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    boxLayoutDefaults._supply(layoutIn, layoutOut, fullData, coerce, 'violin');
}
