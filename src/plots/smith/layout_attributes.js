import colorAttrs from '../../components/color/attributes.js';
import axesAttrs from '../cartesian/layout_attributes.js';
import { attributes as domainAttrs } from '../domain.js';
import _index from '../../lib/index.js';
const { extendFlat } = _index;
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
const axisLineGridAttr = overrideAll({
    color: axesAttrs.color,
    showline: extendFlat({}, axesAttrs.showline, { dflt: true }),
    linecolor: axesAttrs.linecolor,
    linewidth: axesAttrs.linewidth,
    showgrid: extendFlat({}, axesAttrs.showgrid, { dflt: true }),
    gridcolor: axesAttrs.gridcolor,
    gridwidth: axesAttrs.gridwidth,
    griddash: axesAttrs.griddash
}, 'plot', 'from-root');
const axisTickAttrs = overrideAll({
    ticklen: axesAttrs.ticklen,
    tickwidth: extendFlat({}, axesAttrs.tickwidth, { dflt: 2 }),
    tickcolor: axesAttrs.tickcolor,
    showticklabels: axesAttrs.showticklabels,
    labelalias: axesAttrs.labelalias,
    showtickprefix: axesAttrs.showtickprefix,
    tickprefix: axesAttrs.tickprefix,
    showticksuffix: axesAttrs.showticksuffix,
    ticksuffix: axesAttrs.ticksuffix,
    tickfont: axesAttrs.tickfont,
    tickformat: axesAttrs.tickformat,
    hoverformat: axesAttrs.hoverformat,
    layer: axesAttrs.layer
}, 'plot', 'from-root');
const realAxisAttrs = extendFlat({
    visible: extendFlat({}, axesAttrs.visible, { dflt: true }),
    tickvals: {
        dflt: [0.2, 0.5, 1, 2, 5],
        valType: 'data_array',
        editType: 'plot',
        description: 'Sets the values at which ticks on this axis appear.'
    },
    tickangle: extendFlat({}, axesAttrs.tickangle, { dflt: 90 }),
    ticks: {
        valType: 'enumerated',
        values: ['top', 'bottom', ''],
        editType: 'ticks',
        description: [
            'Determines whether ticks are drawn or not.',
            'If **, this axis\' ticks are not drawn.',
            'If *top* (*bottom*), this axis\' are drawn above (below)',
            'the axis line.'
        ].join(' ')
    },
    side: {
        valType: 'enumerated',
        values: ['top', 'bottom'],
        dflt: 'top',
        editType: 'plot',
        description: [
            'Determines on which side of real axis line',
            'the tick and tick labels appear.'
        ].join(' ')
    },
    editType: 'calc',
}, axisLineGridAttr, axisTickAttrs);
const imaginaryAxisAttrs = extendFlat({
    visible: extendFlat({}, axesAttrs.visible, { dflt: true }),
    tickvals: {
        valType: 'data_array',
        editType: 'plot',
        description: [
            'Sets the values at which ticks on this axis appear.',
            'Defaults to `realaxis.tickvals` plus the same as negatives and zero.'
        ].join(' ')
    },
    ticks: axesAttrs.ticks,
    editType: 'calc'
}, axisLineGridAttr, axisTickAttrs);
export default {
    domain: domainAttrs({ name: 'smith', editType: 'plot' }),
    bgcolor: {
        valType: 'color',
        editType: 'plot',
        dflt: colorAttrs.background,
        description: 'Set the background color of the subplot'
    },
    realaxis: realAxisAttrs,
    imaginaryaxis: imaginaryAxisAttrs,
    editType: 'calc'
};
