import Lib from '../../lib/index.js';
import Color from '../color/index.js';
import Template from '../../plot_api/plot_template.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
import constants from './constants.js';

export default function handleDefaults(containerIn: any, containerOut: any, layout: any, counterAxes: any, calendar: any) {
    const selectorIn = containerIn.rangeselector || {};
    const selectorOut = Template.newContainer(containerOut, 'rangeselector');

    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(selectorIn, selectorOut, attributes, attr, dflt);
    }

    const buttons = handleArrayContainerDefaults(selectorIn, selectorOut, {
        name: 'buttons',
        handleItemDefaults: buttonDefaults,
        calendar: calendar
    });

    const visible = coerce('visible', buttons.length > 0);
    if(visible) {
        const posDflt = getPosDflt(containerOut, layout, counterAxes);
        coerce('x', posDflt[0]);
        coerce('y', posDflt[1]);
        Lib.noneOrAll(containerIn, containerOut, ['x', 'y']);

        coerce('xanchor');
        coerce('yanchor');

        Lib.coerceFont(coerce, 'font', layout.font);

        const bgColor = coerce('bgcolor');
        coerce('activecolor', Color.contrast(bgColor, constants.lightAmount, constants.darkAmount));
        coerce('bordercolor');
        coerce('borderwidth');
    }
}

function buttonDefaults(buttonIn: any, buttonOut: any, selectorOut: any, opts: any) {
    const calendar = opts.calendar;

    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(buttonIn, buttonOut, attributes.buttons, attr, dflt);
    }

    const visible = coerce('visible');

    if(visible) {
        const step = coerce('step');
        if(step !== 'all') {
            if(calendar && calendar !== 'gregorian' && (step === 'month' || step === 'year')) {
                buttonOut.stepmode = 'backward';
            } else {
                coerce('stepmode');
            }

            coerce('count');
        }

        coerce('label');
    }
}

function getPosDflt(containerOut: any, layout: any, counterAxes: any) {
    const anchoredList = counterAxes.filter(function(ax: string) {
        return layout[ax].anchor === containerOut._id;
    });

    let posY = 0;
    for(let i = 0; i < anchoredList.length; i++) {
        const domain = layout[anchoredList[i]].domain;
        if(domain) posY = Math.max(domain[1], posY);
    }

    return [containerOut.domain[0], posY + constants.yPad];
}
