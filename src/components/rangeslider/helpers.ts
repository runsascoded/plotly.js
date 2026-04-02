import type { FullAxis, FullLayout, GraphDiv } from '../../../types/core';
import axisIDs from '../../plots/cartesian/axis_ids.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import constants from './constants.js';
import _alignment from '../../constants/alignment.js';
const { LINE_SPACING } = _alignment;
const name = constants.name;

function isVisible(ax: FullAxis) {
    const rangeSlider = ax && ax[name];
    return rangeSlider && rangeSlider.visible;
}
export { isVisible };

export const makeData = function(fullLayout: FullLayout) {
    const axes = axisIDs.list({ _fullLayout: fullLayout }, 'x', true);
    const margin = fullLayout.margin;
    const rangeSliderData = [];

    for(let i = 0; i < axes.length; i++) {
        const ax = axes[i];

        if(isVisible(ax)) {
            rangeSliderData.push(ax);

            const opts = ax[name];
            opts._id = name + ax._id;
            opts._height = (fullLayout.height - margin.b - margin.t) * opts.thickness;
            opts._offsetShift = Math.floor(opts.borderwidth / 2);
        }
    }

    fullLayout._rangeSliderData = rangeSliderData;
};

export const autoMarginOpts = function(gd: GraphDiv, ax: FullAxis) {
    const fullLayout = gd._fullLayout;
    const opts = ax[name];
    const axLetter = ax._id.charAt(0);

    let bottomDepth = 0;
    let titleHeight = 0;
    if(ax.side === 'bottom') {
        bottomDepth = ax._depth;
        const axTitle = ax.title as { text: string; font: any };
        if(axTitle.text !== fullLayout._dfltTitle[axLetter]) {
            // as in rangeslider/draw.js
            titleHeight = 1.5 * axTitle.font.size + 10 + opts._offsetShift;
            // multi-line extra bump
            const extraLines = (axTitle.text.match(svgTextUtils.BR_TAG_ALL) || []).length;
            titleHeight += extraLines * axTitle.font.size * LINE_SPACING;
        }
    }

    return {
        x: 0,
        y: ax._counterDomainMin,
        l: 0,
        r: 0,
        t: 0,
        b: opts._height + bottomDepth + Math.max(fullLayout.margin.b, titleHeight),
        pad: constants.extraPad + opts._offsetShift * 2
    };
};

export default { makeData, autoMarginOpts, isVisible };
