import { hovertemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import { extendFlat } from '../../lib/extend.js';
import scatterPolarAttrs from '../scatterpolar/attributes.js';
import barAttrs from '../bar/attributes.js';
export default {
    r: scatterPolarAttrs.r,
    theta: scatterPolarAttrs.theta,
    r0: scatterPolarAttrs.r0,
    dr: scatterPolarAttrs.dr,
    theta0: scatterPolarAttrs.theta0,
    dtheta: scatterPolarAttrs.dtheta,
    thetaunit: scatterPolarAttrs.thetaunit,
    // orientation: {
    //     valType: 'enumerated',
    //     values: ['radial', 'angular'],
    //     editType: 'calc+clearAxisTypes',
    //     description: 'Sets the orientation of the bars.'
    // },
    base: extendFlat({}, barAttrs.base, {
        description: [
            'Sets where the bar base is drawn (in radial axis units).',
            'In *stack* barmode,',
            'traces that set *base* will be excluded',
            'and drawn in *overlay* mode instead.'
        ].join(' ')
    }),
    offset: extendFlat({}, barAttrs.offset, {
        description: ['Shifts the angular position where the bar is drawn', '(in *thetatunit* units).'].join(' ')
    }),
    width: extendFlat({}, barAttrs.width, {
        description: ['Sets the bar angular width (in *thetaunit* units).'].join(' ')
    }),
    text: extendFlat({}, barAttrs.text, {
        description: [
            'Sets hover text elements associated with each bar.',
            'If a single string, the same string appears over all bars.',
            'If an array of string, the items are mapped in order to the',
            "this trace's coordinates."
        ].join(' ')
    }),
    hovertext: extendFlat({}, barAttrs.hovertext, {
        description: 'Same as `text`.'
    }),
    // textposition: {},
    // textfont: {},
    // insidetextfont: {},
    // outsidetextfont: {},
    // constraintext: {},
    // cliponaxis: extendFlat({}, barAttrs.cliponaxis, {dflt: false}),
    marker: barPolarMarker(),
    hoverinfo: scatterPolarAttrs.hoverinfo,
    hovertemplate: hovertemplateAttrs(),
    hovertemplatefallback: templatefallbackAttrs(),
    selected: barAttrs.selected,
    unselected: barAttrs.unselected
    // error_x (error_r, error_theta)
    // error_y
};
function barPolarMarker() {
    const marker = extendFlat({}, barAttrs.marker);
    delete marker.cornerradius;
    return marker;
}
