import colorAttrs from '../../components/color/attributes.js';
import { attributes as domainAttrs } from '../domain.js';
import axesAttrs from '../cartesian/layout_attributes.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import { extendFlat } from '../../lib/extend.js';

var ternaryAxesAttrs = {
    title: {
        text: axesAttrs.title.text,
        font: axesAttrs.title.font
        // TODO does standoff here make sense?
    },
    color: axesAttrs.color,
    // ticks
    tickmode: axesAttrs.minor.tickmode,
    nticks: extendFlat({}, axesAttrs.nticks, {dflt: 6, min: 1}),
    tick0: axesAttrs.tick0,
    dtick: axesAttrs.dtick,
    tickvals: axesAttrs.tickvals,
    ticktext: axesAttrs.ticktext,
    ticks: axesAttrs.ticks,
    ticklen: axesAttrs.ticklen,
    tickwidth: axesAttrs.tickwidth,
    tickcolor: axesAttrs.tickcolor,
    ticklabelstep: axesAttrs.ticklabelstep,
    showticklabels: axesAttrs.showticklabels,
    labelalias: axesAttrs.labelalias,
    showtickprefix: axesAttrs.showtickprefix,
    tickprefix: axesAttrs.tickprefix,
    showticksuffix: axesAttrs.showticksuffix,
    ticksuffix: axesAttrs.ticksuffix,
    showexponent: axesAttrs.showexponent,
    exponentformat: axesAttrs.exponentformat,
    minexponent: axesAttrs.minexponent,
    separatethousands: axesAttrs.separatethousands,
    tickfont: axesAttrs.tickfont,
    tickangle: axesAttrs.tickangle,
    tickformat: axesAttrs.tickformat,
    tickformatstops: axesAttrs.tickformatstops,
    hoverformat: axesAttrs.hoverformat,
    // lines and grids
    showline: extendFlat({}, axesAttrs.showline, {dflt: true}),
    linecolor: axesAttrs.linecolor,
    linewidth: axesAttrs.linewidth,
    showgrid: extendFlat({}, axesAttrs.showgrid, {dflt: true}),
    gridcolor: axesAttrs.gridcolor,
    gridwidth: axesAttrs.gridwidth,
    griddash: axesAttrs.griddash,
    layer: axesAttrs.layer,
    // range
    min: {
        valType: 'number',
        dflt: 0,
        min: 0,
        description: [
            'The minimum value visible on this axis.',
            'The maximum is determined by the sum minus the minimum',
            'values of the other two axes. The full view corresponds to',
            'all the minima set to zero.'
        ].join(' ')
    },
};

var attrs = overrideAll({
    domain: domainAttrs({name: 'ternary'}),

    bgcolor: {
        valType: 'color',
        dflt: colorAttrs.background,
        description: 'Set the background color of the subplot'
    },
    sum: {
        valType: 'number',
        dflt: 1,
        min: 0,
        description: [
            'The number each triplet should sum to,',
            'and the maximum range of each axis'
        ].join(' ')
    },
    aaxis: ternaryAxesAttrs,
    baxis: ternaryAxesAttrs,
    caxis: ternaryAxesAttrs
}, 'plot', 'from-root')

// set uirevisions outside of `overrideAll` so we can get `editType: none`
attrs.uirevision = {
    valType: 'any',
    editType: 'none',
    description: [
        'Controls persistence of user-driven changes in axis `min` and `title`,',
        'if not overridden in the individual axes.',
        'Defaults to `layout.uirevision`.'
    ].join(' ')
};

attrs.aaxis.uirevision = attrs.baxis.uirevision = attrs.caxis.uirevision = {
    valType: 'any',
    editType: 'none',
    description: [
        'Controls persistence of user-driven changes in axis `min`,',
        'and `title` if in `editable: true` configuration.',
        'Defaults to `ternary<N>.uirevision`.'
    ].join(' ')
};

export default attrs;
