import d3 from '@plotly/d3';
import Lib from '../../lib/index.js';
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

function loneUnhover(containerOrSelection) {
    // duck type whether the arg is a d3 selection because ie9 doesn't
    // handle instanceof like modern browsers do.
    var selection = Lib.isD3Selection(containerOrSelection) ?
            containerOrSelection :
            d3.select(containerOrSelection);

    selection.selectAll('g.hovertext').remove();
    selection.selectAll('.spikeline').remove();
}

// helpers for traces that use Fx.loneHover

function castHoverOption(trace, ptNumber, attr) {
    return Lib.castOption(trace, ptNumber, 'hoverlabel.' + attr);
}

function castHoverinfo(trace, fullLayout, ptNumber) {
    function _coerce(val) {
        return Lib.coerceHoverinfo({hoverinfo: val}, {_module: trace._module}, fullLayout);
    }

    return Lib.castOption(trace, ptNumber, 'hoverinfo', _coerce);
}
