import carpetAttrs from './attributes.js';
import _index from '../../components/color/index.js';
const { addOpacity } = _index;
import { getComponentMethod } from '../../registry.js';
import Lib from '../../lib/index.js';
import handleTickValueDefaults from '../../plots/cartesian/tick_value_defaults.js';
import handleTickLabelDefaults from '../../plots/cartesian/tick_label_defaults.js';
import handlePrefixSuffixDefaults from '../../plots/cartesian/prefix_suffix_defaults.js';
import handleCategoryOrderDefaults from '../../plots/cartesian/category_order_defaults.js';
import setConvert from '../../plots/cartesian/set_convert.js';
import autoType from '../../plots/cartesian/axis_autotype.js';

export default function handleAxisDefaults(containerIn: any, containerOut: any, options: any) {
    const letter = options.letter;
    const font = options.font || {};
    const attributes = (carpetAttrs as any)[letter + 'axis'];

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(containerIn, containerOut, attributes, attr, dflt);
    }

    function coerce2(attr: string, dflt?: any) {
        return Lib.coerce2(containerIn, containerOut, attributes, attr, dflt);
    }

    // set up some private properties
    if(options.name) {
        containerOut._name = options.name;
        containerOut._id = options.name;
    }

    // now figure out type and do some more initialization
    coerce('autotypenumbers', options.autotypenumbersDflt);
    let axType = coerce('type');
    if(axType === '-') {
        if(options.data) setAutoType(containerOut, options.data);

        if(containerOut.type === '-') {
            containerOut.type = 'linear';
        } else {
            // copy autoType back to input axis
            // note that if this object didn't exist
            // in the input layout, we have to put it in
            // this happens in the main supplyDefaults function
            axType = containerIn.type = containerOut.type;
        }
    }

    coerce('smoothing');
    coerce('cheatertype');

    coerce('showticklabels');
    coerce('labelprefix', letter + ' = ');
    coerce('labelsuffix');
    coerce('showtickprefix');
    coerce('showticksuffix');

    coerce('separatethousands');
    coerce('tickformat');
    coerce('exponentformat');
    coerce('minexponent');
    coerce('showexponent');
    coerce('categoryorder');

    coerce('tickmode');
    coerce('tickvals');
    coerce('ticktext');
    coerce('tick0');
    coerce('dtick');

    if(containerOut.tickmode === 'array') {
        coerce('arraytick0');
        coerce('arraydtick');
    }

    coerce('labelpadding');

    containerOut._hovertitle = letter;

    if(axType === 'date') {
        const handleCalendarDefaults = getComponentMethod('calendars', 'handleDefaults');
        handleCalendarDefaults(containerIn, containerOut, 'calendar', options.calendar);
    }

    // we need some of the other functions setConvert attaches, but for
    // path finding, override pixel scaling to simple passthrough (identity)
    setConvert(containerOut, options.fullLayout);
    containerOut.c2p = Lib.identity;

    const dfltColor = coerce('color', options.dfltColor);
    // if axis.color was provided, use it for fonts too; otherwise,
    // inherit from global font color in case that was provided.
    const dfltFontColor = (dfltColor === containerIn.color) ? dfltColor : font.color;

    const title = coerce('title.text');
    if(title) {
        Lib.coerceFont(coerce, 'title.font', font, { overrideDflt: {
            size: Lib.bigFont(font.size),
            color: dfltFontColor
        }});
        coerce('title.offset');
    }

    coerce('tickangle');

    const autoRange = coerce('autorange', !containerOut.isValidRange(containerIn.range));

    if(autoRange) coerce('rangemode');

    coerce('range');
    containerOut.cleanRange();

    coerce('fixedrange');

    handleTickValueDefaults(containerIn, containerOut, coerce, axType);
    handlePrefixSuffixDefaults(containerIn, containerOut, coerce, axType, options);
    handleTickLabelDefaults(containerIn, containerOut, coerce, axType, options);
    handleCategoryOrderDefaults(containerIn, containerOut, coerce, {
        data: options.data,
        dataAttr: letter
    });

    const gridColor = coerce2('gridcolor', addOpacity(dfltColor, 0.3));
    const gridWidth = coerce2('gridwidth');
    const gridDash = coerce2('griddash');
    const showGrid = coerce('showgrid');

    if(!showGrid) {
        delete containerOut.gridcolor;
        delete containerOut.gridwidth;
        delete containerOut.griddash;
    }

    const startLineColor = coerce2('startlinecolor', dfltColor);
    const startLineWidth = coerce2('startlinewidth', gridWidth);
    const showStartLine = coerce('startline', containerOut.showgrid || !!startLineColor || !!startLineWidth);

    if(!showStartLine) {
        delete containerOut.startlinecolor;
        delete containerOut.startlinewidth;
    }

    const endLineColor = coerce2('endlinecolor', dfltColor);
    const endLineWidth = coerce2('endlinewidth', gridWidth);
    const showEndLine = coerce('endline', containerOut.showgrid || !!endLineColor || !!endLineWidth);

    if(!showEndLine) {
        delete containerOut.endlinecolor;
        delete containerOut.endlinewidth;
    }

    if(!showGrid) {
        delete containerOut.gridcolor;
        delete containerOut.gridwidth;
        delete containerOut.griddash;
    } else {
        coerce('minorgridcount');
        coerce('minorgridwidth', gridWidth);
        coerce('minorgriddash', gridDash);
        coerce('minorgridcolor', addOpacity(gridColor, 0.06));

        if(!containerOut.minorgridcount) {
            delete containerOut.minorgridwidth;
            delete containerOut.minorgriddash;
            delete containerOut.minorgridcolor;
        }
    }

    if(containerOut.showticklabels === 'none') {
        delete containerOut.tickfont;
        delete containerOut.tickangle;
        delete containerOut.showexponent;
        delete containerOut.exponentformat;
        delete containerOut.minexponent;
        delete containerOut.tickformat;
        delete containerOut.showticksuffix;
        delete containerOut.showtickprefix;
    }

    if(!containerOut.showticksuffix) {
        delete containerOut.ticksuffix;
    }

    if(!containerOut.showtickprefix) {
        delete containerOut.tickprefix;
    }

    // It needs to be coerced, then something above overrides this deep in the axis code,
    // but no, we *actually* want to coerce this.
    coerce('tickmode');

    return containerOut;
}

function setAutoType(ax: any, data: any) {
    // new logic: let people specify any type they want,
    // only autotype if type is '-'
    if(ax.type !== '-') return;

    const id = ax._id;
    const axLetter = id.charAt(0);

    const calAttr = axLetter + 'calendar';
    const calendar = ax[calAttr];

    ax.type = autoType(data, calendar, {
        autotypenumbers: ax.autotypenumbers
    });
}
