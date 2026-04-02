import Color from '../../components/color/index.js';
import Template from '../../plot_api/plot_template.js';
import Lib from '../../lib/index.js';
import handleSubplotDefaults from '../subplot_defaults.js';
import handleTickLabelDefaults from '../cartesian/tick_label_defaults.js';
import handlePrefixSuffixDefaults from '../cartesian/prefix_suffix_defaults.js';
import handleTickMarkDefaults from '../cartesian/tick_mark_defaults.js';
import handleTickValueDefaults from '../cartesian/tick_value_defaults.js';
import handleLineGridDefaults from '../cartesian/line_grid_defaults.js';
import layoutAttributes from './layout_attributes.js';
import type { FullLayout, FullTrace } from '../../../types/core';

const axesNames = ['aaxis', 'baxis', 'caxis'];

export default function supplyLayoutDefaults(layoutIn: any, layoutOut: FullLayout, fullData: FullTrace[]) {
    handleSubplotDefaults(layoutIn, layoutOut, fullData, {
        type: 'ternary',
        attributes: layoutAttributes,
        handleDefaults: handleTernaryDefaults,
        font: layoutOut.font,
        paper_bgcolor: layoutOut.paper_bgcolor
    });
}

function handleTernaryDefaults(ternaryLayoutIn, ternaryLayoutOut, coerce, options) {
    const bgColor = coerce('bgcolor');
    const sum = coerce('sum');
    options.bgColor = Color.combine(bgColor, options.paper_bgcolor);
    let axName, containerIn, containerOut;

    // TODO: allow most (if not all) axis attributes to be set
    // in the outer container and used as defaults in the individual axes?

    for(let j = 0; j < axesNames.length; j++) {
        axName = axesNames[j];
        containerIn = ternaryLayoutIn[axName] || {};
        containerOut = Template.newContainer(ternaryLayoutOut, axName);
        containerOut._name = axName;

        handleAxisDefaults(containerIn, containerOut, options, ternaryLayoutOut);
    }

    // if the min values contradict each other, set them all to default (0)
    // and delete *all* the inputs so the user doesn't get confused later by
    // changing one and having them all change.
    const aaxis = ternaryLayoutOut.aaxis;
    const baxis = ternaryLayoutOut.baxis;
    const caxis = ternaryLayoutOut.caxis;
    if(aaxis.min + baxis.min + caxis.min >= sum) {
        aaxis.min = 0;
        baxis.min = 0;
        caxis.min = 0;
        if(ternaryLayoutIn.aaxis) delete ternaryLayoutIn.aaxis.min;
        if(ternaryLayoutIn.baxis) delete ternaryLayoutIn.baxis.min;
        if(ternaryLayoutIn.caxis) delete ternaryLayoutIn.caxis.min;
    }
}

function handleAxisDefaults(containerIn, containerOut, options, ternaryLayoutOut) {
    const axAttrs = layoutAttributes[containerOut._name];

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(containerIn, containerOut, axAttrs, attr, dflt);
    }

    coerce('uirevision', ternaryLayoutOut.uirevision);

    containerOut.type = 'linear'; // no other types allowed for ternary

    const dfltColor = coerce('color');
    // if axis.color was provided, use it for fonts too; otherwise,
    // inherit from global font color in case that was provided.
    const dfltFontColor = (dfltColor !== axAttrs.color.dflt) ? dfltColor : options.font.color;

    const axName = containerOut._name;
    const letterUpper = axName.charAt(0).toUpperCase();
    const dfltTitle = 'Component ' + letterUpper;

    const title = coerce('title.text', dfltTitle);
    containerOut._hovertitle = title === dfltTitle ? title : letterUpper;

    Lib.coerceFont(coerce, 'title.font', options.font, { overrideDflt: {
        size: Lib.bigFont(options.font.size),
        color: dfltFontColor
    }});

    // range is just set by 'min' - max is determined by the other axes mins
    coerce('min');

    handleTickValueDefaults(containerIn, containerOut, coerce, 'linear');
    handlePrefixSuffixDefaults(containerIn, containerOut, coerce, 'linear');
    handleTickLabelDefaults(containerIn, containerOut, coerce, 'linear', {
        noAutotickangles: true,
        noTicklabelshift: true,
        noTicklabelstandoff: true
    });
    handleTickMarkDefaults(containerIn, containerOut, coerce,
        { outerTicks: true });

    const showTickLabels = coerce('showticklabels');
    if(showTickLabels) {
        Lib.coerceFont(coerce, 'tickfont', options.font, { overrideDflt: {
            color: dfltFontColor
        }});
        coerce('tickangle');
        coerce('tickformat');
    }

    handleLineGridDefaults(containerIn, containerOut, coerce, {
        dfltColor: dfltColor,
        bgColor: options.bgColor,
        // default grid color is darker here (60%, vs cartesian default ~91%)
        // because the grid is not square so the eye needs heavier cues to follow
        blend: 60,
        showLine: true,
        showGrid: true,
        noZeroLine: true,
        attributes: axAttrs
    });

    coerce('hoverformat');
    coerce('layer');
}
