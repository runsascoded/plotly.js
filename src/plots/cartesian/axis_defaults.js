import isNumeric from 'fast-isnumeric';
import { getComponentMethod } from '../../registry.js';
import Lib, { bigFont, coerceFont, warn } from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import handleArrayContainerDefaults from '../array_container_defaults.js';
import layoutAttributes from './layout_attributes.js';
import handleTickValueDefaults from './tick_value_defaults.js';
import handleTickMarkDefaults from './tick_mark_defaults.js';
import handleTickLabelDefaults from './tick_label_defaults.js';
import handlePrefixSuffixDefaults from './prefix_suffix_defaults.js';
import handleCategoryOrderDefaults from './category_order_defaults.js';
import handleLineGridDefaults from './line_grid_defaults.js';
import handleRangeDefaults from './range_defaults.js';
import setConvert from './set_convert.js';
import _constants from './constants.js';
const { WEEKDAY_PATTERN: DAY_OF_WEEK, HOUR_PATTERN: HOUR } = _constants;
export default function handleAxisDefaults(containerIn, containerOut, coerce, options, layoutOut) {
    const letter = options.letter;
    const font = options.font || {};
    const splomStash = options.splomStash || {};
    const visible = coerce('visible', !options.visibleDflt);
    const axTemplate = containerOut._template || {};
    const axType = containerOut.type || axTemplate.type || '-';
    let ticklabelmode;
    if (axType === 'date') {
        const handleCalendarDefaults = getComponentMethod('calendars', 'handleDefaults');
        handleCalendarDefaults(containerIn, containerOut, 'calendar', options.calendar);
        if (!options.noTicklabelmode) {
            ticklabelmode = coerce('ticklabelmode');
        }
    }
    if (!options.noTicklabelindex && (axType === 'date' || axType === 'linear')) {
        coerce('ticklabelindex');
    }
    let ticklabelposition = '';
    if (!options.noTicklabelposition || axType === 'multicategory') {
        ticklabelposition = Lib.coerce(containerIn, containerOut, {
            ticklabelposition: {
                valType: 'enumerated',
                dflt: 'outside',
                values: ticklabelmode === 'period' ? ['outside', 'inside'] :
                    letter === 'x' ? [
                        'outside', 'inside',
                        'outside left', 'inside left',
                        'outside right', 'inside right'
                    ] : [
                        'outside', 'inside',
                        'outside top', 'inside top',
                        'outside bottom', 'inside bottom'
                    ]
            }
        }, 'ticklabelposition');
    }
    if (!options.noTicklabeloverflow) {
        coerce('ticklabeloverflow', ticklabelposition.indexOf('inside') !== -1 ?
            'hide past domain' :
            axType === 'category' ||
                axType === 'multicategory' ?
                'allow' :
                'hide past div');
    }
    setConvert(containerOut, layoutOut);
    handleRangeDefaults(containerIn, containerOut, coerce, options);
    handleCategoryOrderDefaults(containerIn, containerOut, coerce, options);
    if (!options.noHover) {
        if (axType !== 'category')
            coerce('hoverformat');
        if (!options.noUnifiedhovertitle) {
            coerce('unifiedhovertitle.text');
        }
    }
    const dfltColor = coerce('color');
    // if axis.color was provided, use it for fonts too; otherwise,
    // inherit from global font color in case that was provided.
    // Compare to dflt rather than to containerIn, so we can provide color via
    // template too.
    const dfltFontColor = (dfltColor !== layoutAttributes.color.dflt) ? dfltColor : font.color;
    // try to get default title from splom trace, fallback to graph-wide value
    const dfltTitle = splomStash.label || layoutOut._dfltTitle[letter];
    handlePrefixSuffixDefaults(containerIn, containerOut, coerce, axType, options);
    if (!visible)
        return containerOut;
    coerce('title.text', dfltTitle);
    coerceFont(coerce, 'title.font', font, { overrideDflt: {
            size: bigFont(font.size),
            color: dfltFontColor
        } });
    // major ticks
    handleTickValueDefaults(containerIn, containerOut, coerce, axType);
    const hasMinor = options.hasMinor;
    if (hasMinor) {
        // minor ticks
        Template.newContainer(containerOut, 'minor');
        handleTickValueDefaults(containerIn, containerOut, coerce, axType, { isMinor: true });
    }
    handleTickLabelDefaults(containerIn, containerOut, coerce, axType, options);
    // major and minor ticks
    handleTickMarkDefaults(containerIn, containerOut, coerce, options);
    if (hasMinor) {
        const keepIsMinor = options.isMinor;
        options.isMinor = true;
        handleTickMarkDefaults(containerIn, containerOut, coerce, options);
        options.isMinor = keepIsMinor;
    }
    handleLineGridDefaults(containerIn, containerOut, coerce, {
        dfltColor: dfltColor,
        bgColor: options.bgColor,
        showGrid: options.showGrid,
        hasMinor: hasMinor,
        attributes: layoutAttributes
    });
    // delete minor when no minor ticks or gridlines
    if (hasMinor &&
        !containerOut.minor.ticks &&
        !containerOut.minor.showgrid) {
        delete containerOut.minor;
    }
    // mirror
    if (containerOut.showline || containerOut.ticks)
        coerce('mirror');
    const isMultiCategory = axType === 'multicategory';
    if (!options.noTickson &&
        (axType === 'category' || isMultiCategory) &&
        (containerOut.ticks || containerOut.showgrid)) {
        if (isMultiCategory) {
            coerce('tickson', 'boundaries');
            delete containerOut.ticklabelposition;
        }
        else { // category axis
            coerce('tickson');
        }
    }
    if (isMultiCategory) {
        const showDividers = coerce('showdividers');
        if (showDividers) {
            coerce('dividercolor');
            coerce('dividerwidth');
        }
    }
    if (axType === 'date') {
        handleArrayContainerDefaults(containerIn, containerOut, {
            name: 'rangebreaks',
            inclusionAttr: 'enabled',
            handleItemDefaults: rangebreaksDefaults
        });
        if (!containerOut.rangebreaks.length) {
            delete containerOut.rangebreaks;
        }
        else {
            for (let k = 0; k < containerOut.rangebreaks.length; k++) {
                if (containerOut.rangebreaks[k].pattern === DAY_OF_WEEK) {
                    containerOut._hasDayOfWeekBreaks = true;
                    break;
                }
            }
            setConvert(containerOut, layoutOut);
            if (layoutOut._has('scattergl') || layoutOut._has('splom')) {
                for (let i = 0; i < options.data.length; i++) {
                    const trace = options.data[i];
                    if (trace.type === 'scattergl' || trace.type === 'splom') {
                        trace.visible = false;
                        warn(trace.type +
                            ' traces do not work on axes with rangebreaks.' +
                            ' Setting trace ' + trace.index + ' to `visible: false`.');
                    }
                }
            }
        }
    }
    return containerOut;
}
function rangebreaksDefaults(itemIn, itemOut, containerOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(itemIn, itemOut, layoutAttributes.rangebreaks, attr, dflt);
    }
    const enabled = coerce('enabled');
    if (enabled) {
        const bnds = coerce('bounds');
        if (bnds && bnds.length >= 2) {
            let dfltPattern = '';
            let i, q;
            if (bnds.length === 2) {
                for (i = 0; i < 2; i++) {
                    q = indexOfDay(bnds[i]);
                    if (q) {
                        dfltPattern = DAY_OF_WEEK;
                        break;
                    }
                }
            }
            const pattern = coerce('pattern', dfltPattern);
            if (pattern === DAY_OF_WEEK) {
                for (i = 0; i < 2; i++) {
                    q = indexOfDay(bnds[i]);
                    if (q) {
                        // convert to integers i.e 'Sunday' --> 0
                        itemOut.bounds[i] = bnds[i] = q - 1;
                    }
                }
            }
            if (pattern) {
                // ensure types and ranges
                for (i = 0; i < 2; i++) {
                    q = bnds[i];
                    switch (pattern) {
                        case DAY_OF_WEEK:
                            if (!isNumeric(q)) {
                                itemOut.enabled = false;
                                return;
                            }
                            q = +q;
                            if (q !== Math.floor(q) || // don't accept fractional days for mow
                                q < 0 || q >= 7) {
                                itemOut.enabled = false;
                                return;
                            }
                            // use number
                            itemOut.bounds[i] = bnds[i] = q;
                            break;
                        case HOUR:
                            if (!isNumeric(q)) {
                                itemOut.enabled = false;
                                return;
                            }
                            q = +q;
                            if (q < 0 || q > 24) { // accept 24
                                itemOut.enabled = false;
                                return;
                            }
                            // use number
                            itemOut.bounds[i] = bnds[i] = q;
                            break;
                    }
                }
            }
            if (containerOut.autorange === false) {
                const rng = containerOut.range;
                // if bounds are bigger than the (set) range, disable break
                if (rng[0] < rng[1]) {
                    if (bnds[0] < rng[0] && bnds[1] > rng[1]) {
                        itemOut.enabled = false;
                        return;
                    }
                }
                else if (bnds[0] > rng[0] && bnds[1] < rng[1]) {
                    itemOut.enabled = false;
                    return;
                }
            }
        }
        else {
            const values = coerce('values');
            if (values && values.length) {
                coerce('dvalue');
            }
            else {
                itemOut.enabled = false;
                return;
            }
        }
    }
}
// these numbers are one more than what bounds would be mapped to
const dayStrToNum = {
    sun: 1,
    mon: 2,
    tue: 3,
    wed: 4,
    thu: 5,
    fri: 6,
    sat: 7
};
function indexOfDay(v) {
    if (typeof v !== 'string')
        return;
    return dayStrToNum[v.slice(0, 3).toLowerCase()];
}
