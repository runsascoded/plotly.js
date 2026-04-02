import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import Template from '../../plot_api/plot_template.js';
import handleSubplotDefaults from '../subplot_defaults.js';
import { getSubplotData } from '../get_data.js';
import handlePrefixSuffixDefaults from '../cartesian/prefix_suffix_defaults.js';
import handleTickLabelDefaults from '../cartesian/tick_label_defaults.js';
import handleLineGridDefaults from '../cartesian/line_grid_defaults.js';
import setConvertCartesian from '../cartesian/set_convert.js';
import layoutAttributes from './layout_attributes.js';
import constants from './constants.js';
import type { FullLayout, FullTrace } from '../../../types/core';
const axisNames = constants.axisNames;

const makeImagDflt = memoize(function(realTickvals) {
    // TODO: handle this case outside supply defaults step
    if(Lib.isTypedArray(realTickvals)) realTickvals = Array.from(realTickvals);

    return realTickvals.slice().reverse().map(function(x) { return -x; })
        .concat([0])
        .concat(realTickvals);
}, String);

function handleDefaults(contIn, contOut, coerce, opts) {
    const bgColor = coerce('bgcolor');
    opts.bgColor = Color.combine(bgColor, opts.paper_bgcolor);

    const subplotData = getSubplotData(opts.fullData, constants.name, opts.id);
    const layoutOut = opts.layoutOut;
    let axName;

    function coerceAxis(attr: string, dflt?: any) {
        return coerce(axName + '.' + attr, dflt);
    }

    for(let i = 0; i < axisNames.length; i++) {
        axName = axisNames[i];

        if(!Lib.isPlainObject(contIn[axName])) {
            contIn[axName] = {};
        }

        const axIn = contIn[axName];
        const axOut = Template.newContainer(contOut, axName);
        axOut._id = axOut._name = axName;
        axOut._attr = opts.id + '.' + axName;
        axOut._traceIndices = subplotData.map(function(t) { return t.index; });

        const visible = coerceAxis('visible');

        axOut.type = 'linear';
        setConvertCartesian(axOut, layoutOut);

        handlePrefixSuffixDefaults(axIn, axOut, coerceAxis, axOut.type);

        if(visible) {
            const isRealAxis = axName === 'realaxis';
            if(isRealAxis) coerceAxis('side');

            if(isRealAxis) {
                coerceAxis('tickvals');
            } else {
                const imagTickvalsDflt = makeImagDflt(
                    contOut.realaxis.tickvals ||
                    layoutAttributes.realaxis.tickvals.dflt
                );

                coerceAxis('tickvals', imagTickvalsDflt);
            }

            // TODO: handle this case outside supply defaults step
            if(Lib.isTypedArray(axOut.tickvals)) axOut.tickvals = Array.from(axOut.tickvals);

            let dfltColor;
            let dfltFontColor;
            let dfltFontSize;
            let dfltFontFamily;
            const font = opts.font || {};

            if(visible) {
                dfltColor = coerceAxis('color');
                dfltFontColor = (dfltColor === axIn.color) ? dfltColor : font.color;
                dfltFontSize = font.size;
                dfltFontFamily = font.family;
            }

            handleTickLabelDefaults(axIn, axOut, coerceAxis, axOut.type, {
                noAutotickangles: true,
                noTicklabelshift: true,
                noTicklabelstandoff: true,
                noTicklabelstep: true,
                noAng: !isRealAxis,
                noExp: true,
                font: {
                    color: dfltFontColor,
                    size: dfltFontSize,
                    family: dfltFontFamily
                }
            });

            Lib.coerce2(contIn, contOut, layoutAttributes, axName + '.ticklen');
            Lib.coerce2(contIn, contOut, layoutAttributes, axName + '.tickwidth');
            Lib.coerce2(contIn, contOut, layoutAttributes, axName + '.tickcolor', contOut.color);
            const showTicks = coerceAxis('ticks');
            if(!showTicks) {
                delete contOut[axName].ticklen;
                delete contOut[axName].tickwidth;
                delete contOut[axName].tickcolor;
            }

            handleLineGridDefaults(axIn, axOut, coerceAxis, {
                dfltColor: dfltColor,
                bgColor: opts.bgColor,
                // default grid color is darker here (60%, vs cartesian default ~91%)
                // because the grid is not square so the eye needs heavier cues to follow
                blend: 60,
                showLine: true,
                showGrid: true,
                noZeroLine: true,
                attributes: layoutAttributes[axName]
            });

            coerceAxis('layer');
        }

        coerceAxis('hoverformat');

        delete axOut.type;

        axOut._input = axIn;
    }
}

export default function supplyLayoutDefaults(layoutIn: any, layoutOut: FullLayout, fullData: FullTrace[]) {
    handleSubplotDefaults(layoutIn, layoutOut, fullData, {
        noUirevision: true,
        type: constants.name,
        attributes: layoutAttributes,
        handleDefaults: handleDefaults,
        font: layoutOut.font,
        paper_bgcolor: layoutOut.paper_bgcolor,
        fullData: fullData,
        layoutOut: layoutOut
    });
}

function memoize(fn, keyFn) {
    const cache: any = {};
    return function(val) {
        const newKey = keyFn ? keyFn(val) : val;
        if(newKey in cache) { return cache[newKey]; }

        const out = fn(val);
        cache[newKey] = out;
        return out;
    };
}
