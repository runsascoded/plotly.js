import type { FullTrace } from '../../../types/core';
import Lib, { isPlainObject, simpleMap } from '../../lib/index.js';
import Color from '../../components/color/index.js';
import { isUnifiedHover } from '../../components/fx/helpers.js';
import handleHoverModeDefaults from '../../components/fx/hovermode_defaults.js';
import Template from '../../plot_api/plot_template.js';
import basePlotLayoutAttributes from '../layout_attributes.js';
import layoutAttributes from './layout_attributes.js';
import handleTypeDefaults from './type_defaults.js';
import handleAxisDefaults from './axis_defaults.js';
import constraints from './constraints.js';
import handlePositionDefaults from './position_defaults.js';
import axisIds from './axis_ids.js';
import _constants from './constants.js';
const { AX_ID_PATTERN } = _constants;
import Registry from '../../registry.js';
const id2name = axisIds.id2name;
const name2id = axisIds.name2id;

const traceIs = Registry.traceIs;
const getComponentMethod = Registry.getComponentMethod;

function appendList(cont?: any, k?: any, item?: any): void {
    if(Array.isArray(cont[k])) cont[k].push(item);
    else cont[k] = [item];
}

export default function supplyLayoutDefaults(layoutIn?: any, layoutOut?: any, fullData?: any): any {
    const autotypenumbersDflt = layoutOut.autotypenumbers;

    const ax2traces: any = {};
    const xaMayHide: any = {};
    const yaMayHide: any = {};
    const xaMustDisplay: any = {};
    const yaMustDisplay: any = {};
    const yaMustNotReverse: any = {};
    const yaMayReverse: any = {};
    const axHasImage: any = {};
    const outerTicks: any = {};
    const noGrids: any = {};
    let i, j;

    // look for axes in the data
    for(i = 0; i < fullData.length; i++) {
        const trace: FullTrace = fullData[i];
        if(!traceIs(trace, 'cartesian')) continue;

        let xaName;
        if(trace.xaxis) {
            xaName = id2name(trace.xaxis);
            appendList(ax2traces, xaName, trace);
        } else if(trace.xaxes) {
            for(j = 0; j < trace.xaxes.length; j++) {
                appendList(ax2traces, id2name(trace.xaxes[j]), trace);
            }
        }

        let yaName;
        if(trace.yaxis) {
            yaName = id2name(trace.yaxis);
            appendList(ax2traces, yaName, trace);
        } else if(trace.yaxes) {
            for(j = 0; j < trace.yaxes.length; j++) {
                appendList(ax2traces, id2name(trace.yaxes[j]), trace);
            }
        }

        // logic for funnels
        if(trace.type === 'funnel') {
            if(trace.orientation === 'h') {
                if(xaName) xaMayHide[xaName] = true;
                if(yaName) yaMayReverse[yaName] = true;
            } else {
                if(yaName) yaMayHide[yaName] = true;
            }
        } else if(trace.type === 'image') {
            if(yaName) axHasImage[yaName] = true;
            if(xaName) axHasImage[xaName] = true;
        } else {
            if(yaName) {
                yaMustDisplay[yaName] = true;
                yaMustNotReverse[yaName] = true;
            }

            if(!traceIs(trace, 'carpet') || (trace.type === 'carpet' && !trace._cheater)) {
                if(xaName) xaMustDisplay[xaName] = true;
            }
        }

        // Two things trigger axis visibility:
        // 1. is not carpet
        // 2. carpet that's not cheater

        // The above check for definitely-not-cheater is not adequate. This
        // second list tracks which axes *could* be a cheater so that the
        // full condition triggering hiding is:
        //   *could* be a cheater and *is not definitely visible*
        if(trace.type === 'carpet' && trace._cheater) {
            if(xaName) xaMayHide[xaName] = true;
        }

        // check for default formatting tweaks
        if(traceIs(trace, '2dMap')) {
            outerTicks[xaName] = true;
            outerTicks[yaName] = true;
        }

        if(traceIs(trace, 'oriented')) {
            const positionAxis = trace.orientation === 'h' ? yaName : xaName;
            noGrids[positionAxis] = true;
        }
    }

    const subplots = layoutOut._subplots;
    const xIds = subplots.xaxis;
    const yIds = subplots.yaxis;
    const xNames = simpleMap(xIds, id2name);
    const yNames = simpleMap(yIds, id2name);
    const axNames = xNames.concat(yNames);

    // plot_bgcolor only makes sense if there's a (2D) plot!
    // TODO: bgcolor for each subplot, to inherit from the main one
    let plotBgColor = Color.background;
    if(xIds.length && yIds.length) {
        plotBgColor = Lib.coerce(layoutIn, layoutOut, basePlotLayoutAttributes, 'plot_bgcolor');
    }

    const bgColor = Color.combine(plotBgColor, layoutOut.paper_bgcolor);

    // name of single axis (e.g. 'xaxis', 'yaxis2')
    let axName: any;
    // id of single axis (e.g. 'y', 'x5')
    let axId: any;
    // 'x' or 'y'
    let axLetter;
    // input layout axis container
    let axLayoutIn: any;
    // full layout axis container
    let axLayoutOut: any;

    function newAxLayoutOut() {
        const traces = ax2traces[axName] || [];
        axLayoutOut._traceIndices = traces.map(function(t: any) { return t.index; });
        axLayoutOut._annIndices = [];
        axLayoutOut._shapeIndices = [];
        axLayoutOut._selectionIndices = [];
        axLayoutOut._imgIndices = [];
        axLayoutOut._subplotsWith = [];
        axLayoutOut._counterAxes = [];
        axLayoutOut._name = axLayoutOut._attr = axName;
        axLayoutOut._id = axId;
    }

    function coerce(attr?: any, dflt?: any) {
        return Lib.coerce(axLayoutIn, axLayoutOut, layoutAttributes, attr, dflt);
    }

    function coerce2(attr?: any, dflt?: any) {
        return Lib.coerce2(axLayoutIn, axLayoutOut, layoutAttributes, attr, dflt);
    }

    function getCounterAxes(axLetter?: any) {
        return (axLetter === 'x') ? yIds : xIds;
    }

    function getOverlayableAxes(axLetter?: any, axName?: any) {
        const list = (axLetter === 'x') ? xNames : yNames;
        const out: any[] = [];

        for(let j = 0; j < list.length; j++) {
            const axName2 = list[j];

            if(axName2 !== axName && !(layoutIn[axName2] || {}).overlaying) {
                out.push(name2id(axName2));
            }
        }

        return out;
    }

    // list of available counter axis names
    const counterAxes = {x: getCounterAxes('x'), y: getCounterAxes('y')};
    // list of all x AND y axis ids
    const allAxisIds = counterAxes.x.concat(counterAxes.y);
    // lookup and list of axis ids that axes in axNames have a reference to,
    // even though they are missing from allAxisIds
    const missingMatchedAxisIdsLookup: any = {};
    let missingMatchedAxisIds: any[] = [];

    // fill in 'missing' axis lookup when an axis is set to match an axis
    // not part of the allAxisIds list, save axis type so that we can propagate
    // it to the missing axes
    function addMissingMatchedAxis() {
        const matchesIn = axLayoutIn.matches;
        if(AX_ID_PATTERN.test(matchesIn) && allAxisIds.indexOf(matchesIn) === -1) {
            missingMatchedAxisIdsLookup[matchesIn] = axLayoutIn.type;
            missingMatchedAxisIds = (Object.keys(missingMatchedAxisIdsLookup) as any);
        }
    }

    const hovermode = handleHoverModeDefaults(layoutIn, layoutOut);
    const unifiedHover = isUnifiedHover(hovermode);

    // first pass creates the containers, determines types, and handles most of the settings
    for(i = 0; i < axNames.length; i++) {
        axName = axNames[i];
        axId = name2id(axName);
        axLetter = axName.charAt(0);

        if(!isPlainObject(layoutIn[axName])) {
            layoutIn[axName] = {};
        }

        axLayoutIn = layoutIn[axName];
        axLayoutOut = Template.newContainer(layoutOut, axName, axLetter + 'axis');
        newAxLayoutOut();

        const visibleDflt =
            (axLetter === 'x' && !xaMustDisplay[axName] && xaMayHide[axName]) ||
            (axLetter === 'y' && !yaMustDisplay[axName] && yaMayHide[axName]);

        const reverseDflt =
            (axLetter === 'y' &&
              (
                (!yaMustNotReverse[axName] && yaMayReverse[axName]) ||
                axHasImage[axName]
              ));

        const defaultOptions = {
            hasMinor: true,
            letter: axLetter,
            font: layoutOut.font,
            outerTicks: outerTicks[axName],
            showGrid: !noGrids[axName],
            data: ax2traces[axName] || [],
            bgColor: bgColor,
            calendar: layoutOut.calendar,
            automargin: true,
            visibleDflt: visibleDflt,
            reverseDflt: reverseDflt,
            autotypenumbersDflt: autotypenumbersDflt,
            splomStash: ((layoutOut._splomAxes || {})[axLetter] || {})[axId],
            noAutotickangles: axLetter === 'y'
        };

        coerce('uirevision', layoutOut.uirevision);

        handleTypeDefaults(axLayoutIn, axLayoutOut, coerce, defaultOptions);
        handleAxisDefaults(axLayoutIn, axLayoutOut, coerce, defaultOptions, layoutOut);

        const unifiedSpike = unifiedHover && axLetter === hovermode.charAt(0);
        const spikecolor = coerce2('spikecolor', unifiedHover ? axLayoutOut.color : undefined);
        const spikethickness = coerce2('spikethickness', unifiedHover ? 1.5 : undefined);
        const spikedash = coerce2('spikedash', unifiedHover ? 'dot' : undefined);
        const spikemode = coerce2('spikemode', unifiedHover ? 'across' : undefined);
        const spikesnap = coerce2('spikesnap');
        const showSpikes = coerce('showspikes', !!unifiedSpike || !!spikecolor || !!spikethickness || !!spikedash || !!spikemode || !!spikesnap);

        if(!showSpikes) {
            delete axLayoutOut.spikecolor;
            delete axLayoutOut.spikethickness;
            delete axLayoutOut.spikedash;
            delete axLayoutOut.spikemode;
            delete axLayoutOut.spikesnap;
        }

        // If it exists, the the domain of the axis for the anchor of the overlaying axis
        const overlayingAxis = id2name(axLayoutIn.overlaying);
        let overlayingAnchorDomain = [0, 1];

        if(layoutOut[overlayingAxis] !== undefined) {
            const overlayingAnchor = id2name(layoutOut[overlayingAxis].anchor);
            if(layoutOut[overlayingAnchor] !== undefined) {
                overlayingAnchorDomain = layoutOut[overlayingAnchor].domain;
            }
        }

        handlePositionDefaults(axLayoutIn, axLayoutOut, coerce, {
            letter: axLetter,
            counterAxes: (counterAxes as any)[axLetter],
            overlayableAxes: getOverlayableAxes(axLetter, axName),
            grid: layoutOut.grid,
            overlayingDomain: overlayingAnchorDomain

        });

        coerce('title.standoff');

        addMissingMatchedAxis();

        axLayoutOut._input = axLayoutIn;
    }

    // coerce the 'missing' axes
    i = 0;
    while(i < missingMatchedAxisIds.length) {
        axId = missingMatchedAxisIds[i++];
        axName = id2name(axId);
        axLetter = axName.charAt(0);

        if(!isPlainObject(layoutIn[axName])) {
            layoutIn[axName] = {};
        }

        axLayoutIn = layoutIn[axName];
        axLayoutOut = Template.newContainer(layoutOut, axName, axLetter + 'axis');
        newAxLayoutOut();

        const defaultOptions2 = {
            letter: axLetter,
            font: layoutOut.font,
            outerTicks: outerTicks[axName],
            showGrid: !noGrids[axName],
            data: [],
            bgColor: bgColor,
            calendar: layoutOut.calendar,
            automargin: true,
            visibleDflt: false,
            reverseDflt: false,
            autotypenumbersDflt: autotypenumbersDflt,
            splomStash: ((layoutOut._splomAxes || {})[axLetter] || {})[axId]
        };

        coerce('uirevision', layoutOut.uirevision);

        axLayoutOut.type = missingMatchedAxisIdsLookup[axId] || 'linear';

        handleAxisDefaults(axLayoutIn, axLayoutOut, coerce, defaultOptions2, layoutOut);

        handlePositionDefaults(axLayoutIn, axLayoutOut, coerce, {
            letter: axLetter,
            counterAxes: (counterAxes as any)[axLetter],
            overlayableAxes: getOverlayableAxes(axLetter, axName),
            grid: layoutOut.grid
        });

        coerce('fixedrange');
        coerce('modebardisable');

        addMissingMatchedAxis();

        axLayoutOut._input = axLayoutIn;
    }

    // quick second pass for range slider and selector defaults
    const rangeSliderDefaults = getComponentMethod('rangeslider', 'handleDefaults');
    const rangeSelectorDefaults = getComponentMethod('rangeselector', 'handleDefaults');

    for(i = 0; i < xNames.length; i++) {
        axName = xNames[i];
        axLayoutIn = layoutIn[axName];
        axLayoutOut = layoutOut[axName];

        rangeSliderDefaults(layoutIn, layoutOut, axName);

        if(axLayoutOut.type === 'date') {
            rangeSelectorDefaults(
                axLayoutIn,
                axLayoutOut,
                layoutOut,
                yNames,
                axLayoutOut.calendar
            );
        }

        coerce('fixedrange');
        coerce('modebardisable');
    }

    for(i = 0; i < yNames.length; i++) {
        axName = yNames[i];
        axLayoutIn = layoutIn[axName];
        axLayoutOut = layoutOut[axName];

        const anchoredAxis = layoutOut[id2name(axLayoutOut.anchor)];

        const fixedRangeDflt = getComponentMethod('rangeslider', 'isVisible')(anchoredAxis);

        coerce('fixedrange', fixedRangeDflt);
        coerce('modebardisable');
    }

    // Finally, handle scale constraints and matching axes.
    //
    // We need to do this after all axes have coerced both `type`
    // (so we link only axes of the same type) and
    // `fixedrange` (so we can avoid linking from OR TO a fixed axis).
    constraints.handleDefaults(layoutIn, layoutOut, {
        axIds: allAxisIds.concat(missingMatchedAxisIds).sort(axisIds.idSort),
        axHasImage: axHasImage
    });
}
