import colorbarAttrs from '../colorbar/attributes.js';
import { counter as counterRegex } from '../../lib/regex.js';
import sortObjectKeys from '../../lib/sort_object_keys.js';
import _scales from './scales.js';
const { scales: palettes } = _scales;
const paletteStr = sortObjectKeys(palettes);
function code(s) {
    return '`' + s + '`';
}
export default function colorScaleAttrs(context, opts) {
    context = context || '';
    opts = opts || {};
    const cLetter = opts.cLetter || 'c';
    const onlyIfNumerical = ('onlyIfNumerical' in opts) ? opts.onlyIfNumerical : Boolean(context);
    const noScale = ('noScale' in opts) ? opts.noScale : context === 'marker.line';
    const showScaleDflt = ('showScaleDflt' in opts) ? opts.showScaleDflt : cLetter === 'z';
    const colorscaleDflt = typeof opts.colorscaleDflt === 'string' ? palettes[opts.colorscaleDflt] : null;
    const editTypeOverride = opts.editTypeOverride || '';
    const contextHead = context ? (context + '.') : '';
    let colorAttr, colorAttrFull;
    if ('colorAttr' in opts) {
        colorAttr = opts.colorAttr;
        colorAttrFull = opts.colorAttr;
    }
    else {
        colorAttr = { z: 'z', c: 'color' }[cLetter];
        colorAttrFull = 'in ' + code(contextHead + colorAttr);
    }
    const effectDesc = onlyIfNumerical ?
        ' Has an effect only if ' + colorAttrFull + ' is set to a numerical array.' :
        '';
    const auto = cLetter + 'auto';
    const min = cLetter + 'min';
    const max = cLetter + 'max';
    const mid = cLetter + 'mid';
    const autoFull = code(contextHead + auto);
    const minFull = code(contextHead + min);
    const maxFull = code(contextHead + max);
    const minmaxFull = minFull + ' and ' + maxFull;
    const autoImpliedEdits = {};
    autoImpliedEdits[min] = autoImpliedEdits[max] = undefined;
    const minmaxImpliedEdits = {};
    minmaxImpliedEdits[auto] = false;
    const attrs = {};
    if (colorAttr === 'color') {
        attrs.color = {
            valType: 'color',
            arrayOk: true,
            editType: editTypeOverride || 'style',
            description: [
                'Sets the', context, 'color.',
                'It accepts either a specific color',
                'or an array of numbers that are mapped to the colorscale',
                'relative to the max and min values of the array or relative to',
                minmaxFull, 'if set.'
            ].join(' ')
        };
        if (opts.anim) {
            attrs.color.anim = true;
        }
    }
    attrs[auto] = {
        valType: 'boolean',
        dflt: true,
        editType: 'calc',
        impliedEdits: autoImpliedEdits,
        description: [
            'Determines whether or not the color domain is computed',
            'with respect to the input data (here ' + colorAttrFull + ') or the bounds set in',
            minmaxFull + effectDesc,
            'Defaults to `false` when', minmaxFull, 'are set by the user.'
        ].join(' ')
    };
    attrs[min] = {
        valType: 'number',
        dflt: null,
        editType: editTypeOverride || 'plot',
        impliedEdits: minmaxImpliedEdits,
        description: [
            'Sets the lower bound of the color domain.' + effectDesc,
            'Value should have the same units as', colorAttrFull,
            'and if set,', maxFull, 'must be set as well.'
        ].join(' ')
    };
    attrs[max] = {
        valType: 'number',
        dflt: null,
        editType: editTypeOverride || 'plot',
        impliedEdits: minmaxImpliedEdits,
        description: [
            'Sets the upper bound of the color domain.' + effectDesc,
            'Value should have the same units as', colorAttrFull,
            'and if set,', minFull, 'must be set as well.'
        ].join(' ')
    };
    attrs[mid] = {
        valType: 'number',
        dflt: null,
        editType: 'calc',
        impliedEdits: autoImpliedEdits,
        description: [
            'Sets the mid-point of the color domain by scaling', minFull,
            'and/or', maxFull, 'to be equidistant to this point.' + effectDesc,
            'Value should have the same units as', colorAttrFull + '.',
            'Has no effect when', autoFull, 'is `false`.'
        ].join(' ')
    };
    attrs.colorscale = {
        valType: 'colorscale',
        editType: 'calc',
        dflt: colorscaleDflt,
        impliedEdits: { autocolorscale: false },
        description: [
            'Sets the colorscale.' + effectDesc,
            'The colorscale must be an array containing',
            'arrays mapping a normalized value to an',
            'rgb, rgba, hex, hsl, hsv, or named color string.',
            'At minimum, a mapping for the lowest (0) and highest (1)',
            'values are required. For example,',
            '`[[0, \'rgb(0,0,255)\'], [1, \'rgb(255,0,0)\']]`.',
            'To control the bounds of the colorscale in color space,',
            'use', minmaxFull + '.',
            'Alternatively, `colorscale` may be a palette name string',
            'of the following list: ' + paletteStr + '.'
        ].join(' ')
    };
    attrs.autocolorscale = {
        valType: 'boolean',
        // gets overrode in 'heatmap' & 'surface' for backwards comp.
        dflt: opts.autoColorDflt === false ? false : true,
        editType: 'calc',
        impliedEdits: { colorscale: undefined },
        description: [
            'Determines whether the colorscale is a default palette (`autocolorscale: true`)',
            'or the palette determined by', code(contextHead + 'colorscale') + '.' + effectDesc,
            'In case `colorscale` is unspecified or `autocolorscale` is true, the default',
            'palette will be chosen according to whether numbers in the `color` array are',
            'all positive, all negative or mixed.'
        ].join(' ')
    };
    attrs.reversescale = {
        valType: 'boolean',
        dflt: false,
        editType: 'plot',
        description: [
            'Reverses the color mapping if true.' + effectDesc,
            'If true,', minFull, 'will correspond to the last color',
            'in the array and', maxFull, 'will correspond to the first color.'
        ].join(' ')
    };
    if (!noScale) {
        attrs.showscale = {
            valType: 'boolean',
            dflt: showScaleDflt,
            editType: 'calc',
            description: [
                'Determines whether or not a colorbar is displayed for this trace.' + effectDesc
            ].join(' ')
        };
        attrs.colorbar = colorbarAttrs;
    }
    if (!opts.noColorAxis) {
        attrs.coloraxis = {
            valType: 'subplotid',
            regex: counterRegex('coloraxis'),
            dflt: null,
            editType: 'calc',
            description: [
                'Sets a reference to a shared color axis.',
                'References to these shared color axes are *coloraxis*, *coloraxis2*, *coloraxis3*, etc.',
                'Settings for these shared color axes are set in the layout, under',
                '`layout.coloraxis`, `layout.coloraxis2`, etc.',
                'Note that multiple color scales can be linked to the same color axis.'
            ].join(' ')
        };
    }
    return attrs;
}
