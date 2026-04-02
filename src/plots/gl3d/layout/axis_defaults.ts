import tinycolor from 'tinycolor2';
const colorMix = tinycolor.mix;
import Lib from '../../../lib/index.js';
import Template from '../../../plot_api/plot_template.js';
import layoutAttributes from './axis_attributes.js';
import handleTypeDefaults from '../../cartesian/type_defaults.js';
import handleAxisDefaults from '../../cartesian/axis_defaults.js';

const axesNames = ['xaxis', 'yaxis', 'zaxis'];

// TODO: hard-coded lightness fraction based on gridline default colors
// that differ from other subplot types.
const gridLightness = 100 * (204 - 0x44) / (255 - 0x44);

export default function supplyLayoutDefaults(layoutIn, layoutOut, options) {
    let containerIn, containerOut;

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(containerIn, containerOut, layoutAttributes, attr, dflt);
    }

    for(let j = 0; j < axesNames.length; j++) {
        const axName = axesNames[j];
        containerIn = layoutIn[axName] || {};

        containerOut = Template.newContainer(layoutOut, axName);
        containerOut._id = axName[0] + options.scene;
        containerOut._name = axName;

        handleTypeDefaults(containerIn, containerOut, coerce, options);

        handleAxisDefaults(
            containerIn,
            containerOut,
            coerce,
            {
                font: options.font,
                letter: axName[0],
                data: options.data,
                showGrid: true,
                noAutotickangles: true,
                noMinorloglabels: true,
                noTicklabelindex: true,
                noTickson: true,
                noTicklabelmode: true,
                noTicklabelshift: true,
                noTicklabelstandoff: true,
                noTicklabelstep: true,
                noTicklabelposition: true,
                noTicklabeloverflow: true,
                noInsiderange: true,
                noUnifiedhovertitle: true,
                bgColor: options.bgColor,
                calendar: options.calendar
            },
            options.fullLayout);

        coerce('gridcolor', colorMix(containerOut.color, options.bgColor, gridLightness).toRgbString());
        coerce('title.text', axName[0]);  // shouldn't this be on-par with 2D?

        containerOut.setScale = Lib.noop;

        if(coerce('showspikes')) {
            coerce('spikesides');
            coerce('spikethickness');
            coerce('spikecolor', containerOut.color);
        }

        coerce('showaxeslabels');
        if(coerce('showbackground')) coerce('backgroundcolor');
    }
}
