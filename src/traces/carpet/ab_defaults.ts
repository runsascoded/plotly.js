import handleAxisDefaults from './axis_defaults.js';
import Template from '../../plot_api/plot_template.js';

export default function handleABDefaults(traceIn: any, traceOut: any, fullLayout: any, coerce: any, dfltColor: any) {
    const a = coerce('a');

    if(!a) {
        coerce('da');
        coerce('a0');
    }

    const b = coerce('b');

    if(!b) {
        coerce('db');
        coerce('b0');
    }

    mimickAxisDefaults(traceIn, traceOut, fullLayout, dfltColor);
}

function mimickAxisDefaults(traceIn: any, traceOut: any, fullLayout: any, dfltColor: any) {
    const axesList = ['aaxis', 'baxis'];

    axesList.forEach(function(axName) {
        const axLetter = axName.charAt(0);
        const axIn = traceIn[axName] || {};
        const axOut = Template.newContainer(traceOut, axName);

        const defaultOptions = {
            noAutotickangles: true,
            noTicklabelshift: true,
            noTicklabelstandoff: true,
            noTicklabelstep: true,
            tickfont: 'x',
            id: axLetter + 'axis',
            letter: axLetter,
            font: traceOut.font,
            name: axName,
            data: traceIn[axLetter],
            calendar: traceOut.calendar,
            dfltColor: dfltColor,
            bgColor: fullLayout.paper_bgcolor,
            autotypenumbersDflt: fullLayout.autotypenumbers,
            fullLayout: fullLayout
        };

        handleAxisDefaults(axIn, axOut, defaultOptions);
        axOut._categories = axOut._categories || [];

        // so we don't have to repeat autotype unnecessarily,
        // copy an autotype back to traceIn
        if(!traceIn[axName] && axIn.type !== '-') {
            traceIn[axName] = {type: axIn.type};
        }
    });
}
