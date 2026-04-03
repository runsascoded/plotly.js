import { hovertemplateAttrs, texttemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import colorScaleAttrs from '../../components/colorscale/attributes.js';
import { attributes as domainAttrs } from '../../plots/domain.js';
import pieAttrs from '../pie/attributes.js';
import sunburstAttrs from '../sunburst/attributes.js';
import treemapAttrs from '../treemap/attributes.js';
import constants from '../treemap/constants.js';
import { extendFlat } from '../../lib/extend.js';
import { pattern } from '../../components/drawing/attributes.js';
export default {
    labels: sunburstAttrs.labels,
    parents: sunburstAttrs.parents,
    values: sunburstAttrs.values,
    branchvalues: sunburstAttrs.branchvalues,
    count: sunburstAttrs.count,
    level: sunburstAttrs.level,
    maxdepth: sunburstAttrs.maxdepth,
    tiling: {
        orientation: {
            valType: 'enumerated',
            values: ['v', 'h'],
            dflt: 'h',
            editType: 'plot',
            description: [
                'When set in conjunction with `tiling.flip`, determines on',
                'which side the root nodes are drawn in the chart. If',
                '`tiling.orientation` is *v* and `tiling.flip` is **, the root',
                'nodes appear at the top. If `tiling.orientation` is *v* and',
                '`tiling.flip` is *y*, the root nodes appear at the bottom. If',
                '`tiling.orientation` is *h* and `tiling.flip` is **, the',
                'root nodes appear at the left. If `tiling.orientation` is *h*',
                'and `tiling.flip` is *x*, the root nodes appear at the right.'
            ].join(' ')
        },
        flip: treemapAttrs.tiling.flip,
        pad: {
            valType: 'number',
            min: 0,
            dflt: 0,
            editType: 'plot',
            description: ['Sets the inner padding (in px).'].join(' ')
        },
        editType: 'calc'
    },
    marker: extendFlat({
        colors: sunburstAttrs.marker.colors,
        line: sunburstAttrs.marker.line,
        pattern: pattern,
        editType: 'calc'
    }, colorScaleAttrs('marker', {
        colorAttr: 'colors',
        anim: false // TODO: set to anim: true?
    })),
    leaf: sunburstAttrs.leaf,
    pathbar: treemapAttrs.pathbar,
    text: pieAttrs.text,
    textinfo: sunburstAttrs.textinfo,
    // TODO: incorporate `label` and `value` in the eventData
    texttemplate: texttemplateAttrs({ editType: 'plot' }, { keys: constants.eventDataKeys.concat(['label', 'value']) }),
    texttemplatefallback: templatefallbackAttrs({ editType: 'plot' }),
    hovertext: pieAttrs.hovertext,
    hoverinfo: sunburstAttrs.hoverinfo,
    hovertemplate: hovertemplateAttrs({}, { keys: constants.eventDataKeys }),
    hovertemplatefallback: templatefallbackAttrs(),
    textfont: pieAttrs.textfont,
    insidetextfont: pieAttrs.insidetextfont,
    outsidetextfont: treemapAttrs.outsidetextfont,
    textposition: treemapAttrs.textposition,
    sort: pieAttrs.sort,
    root: sunburstAttrs.root,
    domain: domainAttrs({ name: 'icicle', trace: true, editType: 'calc' })
};
