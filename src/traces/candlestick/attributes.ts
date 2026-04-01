import _index from '../../lib/index.js';
const { extendFlat } = _index;
import _axis_format_attributes from '../../plots/cartesian/axis_format_attributes.js';
const { axisHoverFormat } = _axis_format_attributes;
import OHLCattrs from '../ohlc/attributes.js';
import boxAttrs from '../box/attributes.js';

function directionAttrs(lineColorDefault) {
    return {
        line: {
            color: extendFlat({}, boxAttrs.line.color, { dflt: lineColorDefault }),
            width: boxAttrs.line.width,
            editType: 'style'
        },

        fillcolor: boxAttrs.fillcolor,
        editType: 'style'
    };
}

export default {
    xperiod: OHLCattrs.xperiod,
    xperiod0: OHLCattrs.xperiod0,
    xperiodalignment: OHLCattrs.xperiodalignment,
    xhoverformat: axisHoverFormat('x'),
    yhoverformat: axisHoverFormat('y'),

    x: OHLCattrs.x,
    open: OHLCattrs.open,
    high: OHLCattrs.high,
    low: OHLCattrs.low,
    close: OHLCattrs.close,

    line: {
        width: extendFlat({}, boxAttrs.line.width, {
            description: [
                boxAttrs.line.width.description,
                'Note that this style setting can also be set per',
                'direction via `increasing.line.width` and',
                '`decreasing.line.width`.'
            ].join(' ')
        }),
        editType: 'style'
    },

    increasing: directionAttrs(OHLCattrs.increasing.line.color.dflt),

    decreasing: directionAttrs(OHLCattrs.decreasing.line.color.dflt),

    text: OHLCattrs.text,
    hovertext: OHLCattrs.hovertext,
    hovertemplate: OHLCattrs.hovertemplate,
    hovertemplatefallback: OHLCattrs.hovertemplatefallback,

    whiskerwidth: extendFlat({}, boxAttrs.whiskerwidth, { dflt: 0 }),

    hoverlabel: OHLCattrs.hoverlabel,
    zorder: boxAttrs.zorder
};
