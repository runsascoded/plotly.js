import colorAttrs from '../../components/color/attributes.js';
import { attributes as domainAttrs } from '../domain.js';
import { dash } from '../../components/drawing/attributes.js';
import constants from './constants.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import sortObjectKeys from '../../lib/sort_object_keys.js';

var geoAxesAttrs = {
    range: {
        valType: 'info_array',
        items: [
            {valType: 'number'},
            {valType: 'number'}
        ],
        description: [
            'Sets the range of this axis (in degrees),',
            'sets the map\'s clipped coordinates.'
        ].join(' ')
    },
    showgrid: {
        valType: 'boolean',
        dflt: false,
        description: 'Sets whether or not graticule are shown on the map.'
    },
    tick0: {
        valType: 'number',
        dflt: 0,
        description: [
            'Sets the graticule\'s starting tick longitude/latitude.'
        ].join(' ')
    },
    dtick: {
        valType: 'number',
        description: [
            'Sets the graticule\'s longitude/latitude tick step.'
        ].join(' ')
    },
    gridcolor: {
        valType: 'color',
        dflt: colorAttrs.lightLine,
        description: [
            'Sets the graticule\'s stroke color.'
        ].join(' ')
    },
    gridwidth: {
        valType: 'number',
        min: 0,
        dflt: 1,
        description: [
            'Sets the graticule\'s stroke width (in px).'
        ].join(' ')
    },
    griddash: dash
};

var attrs = {};

// set uirevision outside of overrideAll so it can be `editType: 'none'`
attrs.uirevision = {
    valType: 'any',
    editType: 'none',
    description: [
        'Controls persistence of user-driven changes in the view',
        '(projection and center). Defaults to `layout.uirevision`.'
    ].join(' ')
};

export default attrs;
