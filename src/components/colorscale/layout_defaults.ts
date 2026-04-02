import Lib from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import colorScaleAttrs from './layout_attributes.js';
import colorScaleDefaults from './defaults.js';
import type { FullLayout } from '../../../types/core';

export default function supplyLayoutDefaults(layoutIn: any, layoutOut: FullLayout): void {
    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(layoutIn, layoutOut, colorScaleAttrs, attr, dflt);
    }

    coerce('colorscale.sequential');
    coerce('colorscale.sequentialminus');
    coerce('colorscale.diverging');

    const colorAxes = layoutOut._colorAxes;
    let colorAxIn: any, colorAxOut: any;

    function coerceAx(attr: string, dflt?: any): any {
        return Lib.coerce(colorAxIn, colorAxOut, colorScaleAttrs.coloraxis, attr, dflt);
    }

    for(const k in colorAxes) {
        const stash = colorAxes[k];

        if(stash[0]) {
            colorAxIn = layoutIn[k] || {};
            colorAxOut = Template.newContainer(layoutOut, k, 'coloraxis');
            colorAxOut._name = k;
            colorScaleDefaults(colorAxIn, colorAxOut, layoutOut, coerceAx, {prefix: '', cLetter: 'c'});
        } else {
            for(let i = 0; i < stash[2].length; i++) {
                stash[2][i]();
            }
            delete layoutOut._colorAxes[k];
        }
    }
}
