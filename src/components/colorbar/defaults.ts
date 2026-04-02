import Lib, { bigFont, coerceFont, extendFlat, noneOrAll } from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import handleTickValueDefaults from '../../plots/cartesian/tick_value_defaults.js';
import handleTickMarkDefaults from '../../plots/cartesian/tick_mark_defaults.js';
import handleTickLabelDefaults from '../../plots/cartesian/tick_label_defaults.js';
import handlePrefixSuffixDefaults from '../../plots/cartesian/prefix_suffix_defaults.js';
import attributes from './attributes.js';

export default function colorbarDefaults(containerIn: any, containerOut: any, layout: any) {
    const colorbarOut = Template.newContainer(containerOut, 'colorbar');
    const colorbarIn = containerIn.colorbar || {};

    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(colorbarIn, colorbarOut, attributes, attr, dflt);
    }

    const margin = layout.margin || {t: 0, b: 0, l: 0, r: 0};
    const w = layout.width - margin.l - margin.r;
    const h = layout.height - margin.t - margin.b;

    const orientation = coerce('orientation');
    const isVertical = orientation === 'v';

    const thicknessmode = coerce('thicknessmode');
    coerce('thickness', (thicknessmode === 'fraction') ?
        30 / (isVertical ? w : h) :
        30
    );

    const lenmode = coerce('lenmode');
    coerce('len', (lenmode === 'fraction') ?
        1 :
        isVertical ? h : w
    );

    const yref = coerce('yref');
    const xref = coerce('xref');

    const isPaperY = yref === 'paper';
    const isPaperX = xref === 'paper';

    let defaultX, defaultY, defaultYAnchor;
    let defaultXAnchor = 'left';

    if(isVertical) {
        defaultYAnchor = 'middle';
        defaultXAnchor = isPaperX ? 'left' : 'right';
        defaultX = isPaperX ? 1.02 : 1;
        defaultY = 0.5;
    } else {
        defaultYAnchor = isPaperY ? 'bottom' : 'top';
        defaultXAnchor = 'center';
        defaultX = 0.5;
        defaultY = isPaperY ? 1.02 : 1;
    }

    Lib.coerce(colorbarIn, colorbarOut, {
        x: {
            valType: 'number',
            min: isPaperX ? -2 : 0,
            max: isPaperX ? 3 : 1,
            dflt: defaultX,
        }
    }, 'x');

    Lib.coerce(colorbarIn, colorbarOut, {
        y: {
            valType: 'number',
            min: isPaperY ? -2 : 0,
            max: isPaperY ? 3 : 1,
            dflt: defaultY,
        }
    }, 'y');

    coerce('xanchor', defaultXAnchor);
    coerce('xpad');
    coerce('yanchor', defaultYAnchor);
    coerce('ypad');
    noneOrAll(colorbarIn, colorbarOut, ['x', 'y']);

    coerce('outlinecolor');
    coerce('outlinewidth');
    coerce('bordercolor');
    coerce('borderwidth');
    coerce('bgcolor');

    const ticklabelposition = Lib.coerce(colorbarIn, colorbarOut, {
        ticklabelposition: {
            valType: 'enumerated',
            dflt: 'outside',
            values: isVertical ? [
                'outside', 'inside',
                'outside top', 'inside top',
                'outside bottom', 'inside bottom'
            ] : [
                'outside', 'inside',
                'outside left', 'inside left',
                'outside right', 'inside right'
            ]
        }
    }, 'ticklabelposition');

    coerce('ticklabeloverflow', ticklabelposition.indexOf('inside') !== -1 ? 'hide past domain' : 'hide past div');

    handleTickValueDefaults(colorbarIn, colorbarOut, coerce, 'linear');

    const font = layout.font;
    const opts: any = {
        noAutotickangles: true,
        noTicklabelshift: true,
        noTicklabelstandoff: true,
        outerTicks: false,
        font: font
    };
    if(ticklabelposition.indexOf('inside') !== -1) {
        opts.bgColor = 'black'; // could we instead use the average of colors in the scale?
    }
    handlePrefixSuffixDefaults(colorbarIn, colorbarOut, coerce, 'linear', opts);
    handleTickLabelDefaults(colorbarIn, colorbarOut, coerce, 'linear', opts);
    handleTickMarkDefaults(colorbarIn, colorbarOut, coerce, opts);

    coerce('title.text', layout._dfltTitle.colorbar);

    const tickFont = colorbarOut.showticklabels ? colorbarOut.tickfont : font;

    const dfltTitleFont = extendFlat({}, font, {
        family: tickFont.family,
        size: bigFont(tickFont.size)
    });
    coerceFont(coerce, 'title.font', dfltTitleFont);
    coerce('title.side', isVertical ? 'top' : 'right');
}
