import type { FullLayout, FullTrace } from '../../../types/core';
import { select } from 'd3-selection';
import { castOption, coerceHoverinfo, isD3Selection } from '../../lib/index.js';
import dragElement from '../dragelement/index.js';
import helpers from './helpers.js';
import layoutAttributes from './layout_attributes.js';
import hoverModule from './hover.js';
import _req0 from './constants.js';
import _req1 from './attributes.js';
import _req2 from './layout_global_defaults.js';
import _req3 from './defaults.js';
import _req4 from './layout_defaults.js';
import _req5 from './calc.js';
import _req6 from './click.js';

export { _req3 as fxSupplyDefaults };
export { _req5 as fxCalc };

export default {
    moduleType: 'component',
    name: 'fx',

    constants: _req0,
    schema: {
        layout: layoutAttributes
    },

    attributes: _req1,
    layoutAttributes: layoutAttributes,

    supplyLayoutGlobalDefaults: _req2,
    supplyDefaults: _req3,
    supplyLayoutDefaults: _req4,

    calc: _req5,

    getDistanceFunction: helpers.getDistanceFunction,
    getClosest: helpers.getClosest,
    inbox: helpers.inbox,
    quadrature: helpers.quadrature,
    appendArrayPointValue: helpers.appendArrayPointValue,

    castHoverOption: castHoverOption,
    castHoverinfo: castHoverinfo,

    hover: hoverModule.hover,
    unhover: dragElement.unhover,

    loneHover: hoverModule.loneHover,
    loneUnhover: loneUnhover,

    click: _req6
};

function loneUnhover(containerOrSelection: any): void {
    // duck type whether the arg is a d3 selection because ie9 doesn't
    // handle instanceof like modern browsers do.
    const selection = isD3Selection(containerOrSelection) ?
            containerOrSelection :
            select(containerOrSelection);

    selection.selectAll('g.hovertext').remove();
    selection.selectAll('.spikeline').remove();
}

// helpers for traces that use Fx.loneHover

function castHoverOption(trace: FullTrace, ptNumber: any, attr: string): any {
    return castOption(trace, ptNumber, 'hoverlabel.' + attr);
}

function castHoverinfo(trace: FullTrace, fullLayout: FullLayout, ptNumber: any): any {
    function _coerce(val: any): any {
        return coerceHoverinfo({hoverinfo: val}, {_module: trace._module}, fullLayout);
    }

    return castOption(trace, ptNumber, 'hoverinfo', _coerce);
}
