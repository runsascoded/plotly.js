import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import { getAxisGroup } from '../../plots/cartesian/constraints.js';

export default function handleGroupingDefaults(traceIn: InputTrace, traceOut: FullTrace, fullLayout: FullLayout, coerce: any, barmode: any): void {
    const orientation = traceOut.orientation;
    // N.B. grouping is done across all trace types that support it
    const posAxId = traceOut[({v: 'x', h: 'y'} as any)[orientation] + 'axis'];
    const groupId = getAxisGroup(fullLayout, posAxId) + orientation;

    const alignmentOpts = fullLayout._alignmentOpts || {};
    const alignmentgroup = coerce('alignmentgroup');

    let alignmentGroups = alignmentOpts[groupId];
    if(!alignmentGroups) alignmentGroups = alignmentOpts[groupId] = {};

    let alignmentGroupOpts = alignmentGroups[alignmentgroup];

    if(alignmentGroupOpts) {
        alignmentGroupOpts.traces.push(traceOut);
    } else {
        alignmentGroupOpts = alignmentGroups[alignmentgroup] = {
            traces: [traceOut],
            alignmentIndex: Object.keys(alignmentGroups).length,
            offsetGroups: {}
        };
    }

    const offsetgroup = coerce('offsetgroup') || '';
    const offsetGroups = alignmentGroupOpts.offsetGroups;
    let offsetGroupOpts = offsetGroups[offsetgroup];
    // in barmode 'group', traces without offsetgroup receive their own offsetgroup
    // in other barmodes, traces without offsetgroup are assigned to the same offset group
    traceOut._offsetIndex = 0;
    if(barmode !== 'group' || offsetgroup) {
        if(!offsetGroupOpts) {
            offsetGroupOpts = offsetGroups[offsetgroup] = {
                offsetIndex: Object.keys(offsetGroups).length
            };
        }

        traceOut._offsetIndex = offsetGroupOpts.offsetIndex;
    }
}
