import Registry from '../../registry.js';
import helpers from './helpers.js';

export default function getLegendData(calcdata: any[], opts: any, hasMultipleLegends?: boolean): any[] {
    const inHover = opts._inHover;
    const grouped = helpers.isGrouped(opts);
    const reversed = helpers.isReversed(opts);

    const lgroupToTraces: Record<string, any[]> = {};
    const lgroups: string[] = [];
    let hasOneNonBlankGroup = false;
    const slicesShown: Record<string, Record<string, boolean>> = {};
    let lgroupi = 0;
    let maxNameLength = 0;
    let i: number, j: number;

    function addOneItem(legendId: any, legendGroup: string, legendItem: any): void {
        if(opts.visible === false) return;
        if(hasMultipleLegends && legendId !== opts._id) return;

        // each '' legend group is treated as a separate group
        if(legendGroup === '' || !helpers.isGrouped(opts)) {
            // TODO: check this against fullData legendgroups?
            const uniqueGroup = '~~i' + lgroupi;
            lgroups.push(uniqueGroup);
            lgroupToTraces[uniqueGroup] = [legendItem];
            lgroupi++;
        } else if(lgroups.indexOf(legendGroup) === -1) {
            lgroups.push(legendGroup);
            hasOneNonBlankGroup = true;
            lgroupToTraces[legendGroup] = [legendItem];
        } else {
            lgroupToTraces[legendGroup].push(legendItem);
        }
    }

    // build an { legendgroup: [cd0, cd0], ... } object
    for(i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        const cd0 = cd[0];
        const trace = cd0.trace;
        let lid = trace.legend;
        const lgroup = trace.legendgroup;

        if(!inHover && (!trace.visible || !trace.showlegend)) continue;

        if(Registry.traceIs(trace, 'pie-like')) {
            const legendPerSlice = Array.isArray(trace.legend);
            const showlegendPerSlice = Array.isArray(trace.showlegend);
            if(!slicesShown[lgroup]) slicesShown[lgroup] = {};

            for(j = 0; j < cd.length; j++) {
                if (showlegendPerSlice && trace.showlegend[cd[j].i] === false) {
                    continue;
                }
                if (legendPerSlice) {
                    lid = trace.legend[cd[j].i] || 'legend';
                }
                const labelj = cd[j].label;

                if(!slicesShown[lgroup][labelj]) {
                    addOneItem(lid, lgroup, {
                        label: labelj,
                        color: cd[j].color,
                        i: cd[j].i,
                        trace: trace,
                        pts: cd[j].pts
                    });

                    slicesShown[lgroup][labelj] = true;
                    maxNameLength = Math.max(maxNameLength, (labelj || '').length);
                }
            }
        } else {
            addOneItem(lid, lgroup, cd0);
            maxNameLength = Math.max(maxNameLength, (trace.name || '').length);
        }
    }

    // won't draw a legend in this case
    if(!lgroups.length) return [];

    // collapse all groups into one if all groups are blank
    const shouldCollapse = !hasOneNonBlankGroup || !grouped;

    let legendData: any[] = [];
    for(i = 0; i < lgroups.length; i++) {
        const t = lgroupToTraces[lgroups[i]];
        if(shouldCollapse) {
            legendData.push(t[0]);
        } else {
            legendData.push(t);
        }
    }
    if(shouldCollapse) legendData = [legendData];

    for(i = 0; i < legendData.length; i++) {
        // find minimum rank within group
        let groupMinRank = Infinity;
        for(j = 0; j < legendData[i].length; j++) {
            const rank = legendData[i][j].trace.legendrank;
            if(groupMinRank > rank) groupMinRank = rank;
        }

        // record on first group element
        legendData[i][0]._groupMinRank = groupMinRank;
        legendData[i][0]._preGroupSort = i;
    }

    const orderFn1 = (a: any, b: any): number => {
        return (
            // fallback for old Chrome < 70 https://bugs.chromium.org/p/v8/issues/detail?id=90
            ((a[0]._groupMinRank - b[0]._groupMinRank) || (a[0]._preGroupSort - b[0]._preGroupSort))
        );
    };

    const orderFn2 = (a: any, b: any): number => {
        return (
            // fallback for old Chrome < 70 https://bugs.chromium.org/p/v8/issues/detail?id=90
            ((a.trace.legendrank - b.trace.legendrank) || (a._preSort - b._preSort))
        );
    };

    // sort considering minimum group legendrank
    legendData.forEach((a: any, k: number) => { a[0]._preGroupSort = k; });
    legendData.sort(orderFn1);
    for(i = 0; i < legendData.length; i++) {
        // sort considering trace.legendrank and legend.traceorder
        legendData[i].forEach((a: any, k: number) => { a._preSort = k; });
        legendData[i].sort(orderFn2);

        const firstItemTrace = legendData[i][0].trace;

        let groupTitle: any = null;
        // get group title text
        for(j = 0; j < legendData[i].length; j++) {
            const gt = legendData[i][j].trace.legendgrouptitle;
            if(gt && gt.text) {
                groupTitle = gt;
                if(inHover) gt.font = opts._groupTitleFont;
                break;
            }
        }

        // reverse order
        if(reversed) legendData[i].reverse();

        if(groupTitle) {
            let hasPieLike = false;
            for(j = 0; j < legendData[i].length; j++) {
                if(Registry.traceIs(legendData[i][j].trace, 'pie-like')) {
                    hasPieLike = true;
                    break;
                }
            }

            // set group title text
            legendData[i].unshift({
                i: -1,
                groupTitle: groupTitle,
                noClick: hasPieLike,
                trace: {
                    showlegend: firstItemTrace.showlegend,
                    legendgroup: firstItemTrace.legendgroup,
                    visible: opts.groupclick === 'toggleitem' ? true : firstItemTrace.visible
                }
            });
        }

        // rearrange lgroupToTraces into a d3-friendly array of arrays
        for(j = 0; j < legendData[i].length; j++) {
            legendData[i][j] = [
                legendData[i][j]
            ];
        }
    }

    // number of legend groups - needed in legend/draw.js
    opts._lgroupsLength = legendData.length;
    // maximum name/label length - needed in legend/draw.js
    opts._maxNameLength = maxNameLength;

    return legendData;
}
