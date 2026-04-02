import type { GraphDiv, FullTrace } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import Color from '../../components/color/index.js';

const extendedColorWayList: Record<string, string[]> = {};

function calc(gd: GraphDiv, trace: FullTrace): any[] {
    let cd: any[] = [];

    const fullLayout = gd._fullLayout;
    const hiddenLabels = fullLayout.hiddenlabels || [];

    let labels = trace.labels;
    const colors = trace.marker.colors || [];
    const vals = trace.values;
    const len = trace._length;
    const hasValues = trace._hasValues && len;

    let i, pt;

    if(trace.dlabel) {
        labels = new Array(len);
        for(i = 0; i < len; i++) {
            labels[i] = String(trace.label0 + i * trace.dlabel);
        }
    }

    const allThisTraceLabels: Record<string, number> = {};
    const pullColor = makePullColorFn(fullLayout['_' + trace.type + 'colormap']);
    let vTotal = 0;
    let isAggregated = false;

    for(i = 0; i < len; i++) {
        let v: number, label: string, hidden: boolean;
        if(hasValues) {
            v = vals[i];
            if(!isNumeric(v)) continue;
            v = +v;
        } else v = 1;

        label = labels[i];
        if(label === undefined || label === '') label = i as any;
        label = String(label);

        const thisLabelIndex = allThisTraceLabels[label];
        if(thisLabelIndex === undefined) {
            allThisTraceLabels[label] = cd.length;

            hidden = hiddenLabels.indexOf(label) !== -1;

            if(!hidden) vTotal += v;

            cd.push({
                v: v,
                label: label,
                color: pullColor(colors[i], label),
                i: i,
                pts: [i],
                hidden: hidden
            });
        } else {
            isAggregated = true;

            pt = cd[thisLabelIndex];
            pt.v += v;
            pt.pts.push(i);
            if(!pt.hidden) vTotal += v;

            if(pt.color === false && colors[i]) {
                pt.color = pullColor(colors[i], label);
            }
        }
    }

    // Drop aggregate sums of value 0 or less
    cd = cd.filter((elem: any) => elem.v >= 0);

    const shouldSort = (trace.type === 'funnelarea') ? isAggregated : trace.sort;
    if(shouldSort) cd.sort((a: any, b: any) => b.v - a.v);

    // include the sum of all values in the first point
    if(cd[0]) cd[0].vTotal = vTotal;

    return cd;
}

function makePullColorFn(colorMap: Record<string, any>) {
    return function pullColor(color: any, id: string): any {
        if(!color) return false;

        color = tinycolor(color);
        if(!color.isValid()) return false;

        color = Color.addOpacity(color, color.getAlpha());
        if(!colorMap[id]) colorMap[id] = color;

        return color;
    };
}

/*
 * `calc` filled in (and collated) explicit colors.
 * Now we need to propagate these explicit colors to other traces,
 * and fill in default colors.
 * This is done after sorting, so we pick defaults
 * in the order slices will be displayed
 */
function crossTraceCalc(gd: GraphDiv, plotinfo: any): void { // TODO: should we name the second argument opts?
    let desiredType = (plotinfo || {}).type;
    if(!desiredType) desiredType = 'pie';

    const fullLayout = gd._fullLayout;
    const calcdata = gd.calcdata;
    let colorWay = fullLayout[desiredType + 'colorway'];
    const colorMap = fullLayout['_' + desiredType + 'colormap'];

    if(fullLayout['extend' + desiredType + 'colors']) {
        colorWay = generateExtendedColors(colorWay, extendedColorWayList);
    }
    let dfltColorCount = 0;

    for(let i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        const traceType = cd[0].trace.type;
        if(traceType !== desiredType) continue;

        for(let j = 0; j < cd.length; j++) {
            const pt = cd[j];
            if(pt.color === false) {
                // have we seen this label and assigned a color to it in a previous trace?
                if(colorMap[pt.label]) {
                    pt.color = colorMap[pt.label];
                } else {
                    colorMap[pt.label] = pt.color = colorWay[dfltColorCount % colorWay.length];
                    dfltColorCount++;
                }
            }
        }
    }
}

/**
 * pick a default color from the main default set, augmented by
 * itself lighter then darker before repeating
 */
function generateExtendedColors(colorList: string[], extendedColorWays: Record<string, string[]>): string[] {
    let i: number;
    const colorString = JSON.stringify(colorList);
    let colors = extendedColorWays[colorString];
    if(!colors) {
        colors = colorList.slice();

        for(i = 0; i < colorList.length; i++) {
            colors.push(tinycolor(colorList[i]).lighten(20).toHexString());
        }

        for(i = 0; i < colorList.length; i++) {
            colors.push(tinycolor(colorList[i]).darken(20).toHexString());
        }
        extendedColorWays[colorString] = colors;
    }

    return colors;
}

export default {
    calc: calc,
    crossTraceCalc: crossTraceCalc,

    makePullColorFn: makePullColorFn,
    generateExtendedColors: generateExtendedColors
};
