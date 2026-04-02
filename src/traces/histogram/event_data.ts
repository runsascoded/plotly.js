import type { FullTrace } from '../../../types/core';

export default function eventData(out: any, pt: any, trace: FullTrace, cd: any[], pointNumber: number | number[]): any {
    // standard cartesian event data
    out.x = 'xVal' in pt ? pt.xVal : pt.x;
    out.y = 'yVal' in pt ? pt.yVal : pt.y;

    // for 2d histograms
    if('zLabelVal' in pt) out.z = pt.zLabelVal;

    if(pt.xa) out.xaxis = pt.xa;
    if(pt.ya) out.yaxis = pt.ya;

    // specific to histogram - CDFs do not have pts (yet?)
    if(!(trace.cumulative || {}).enabled) {
        const pts = Array.isArray(pointNumber) ?
            cd[0].pts[pointNumber[0]][pointNumber[1]] :
            cd[pointNumber].pts;

        out.pointNumbers = pts;
        out.binNumber = out.pointNumber;
        delete out.pointNumber;
        delete out.pointIndex;

        let pointIndices;
        if(trace._indexToPoints) {
            pointIndices = [];
            for(let i = 0; i < pts.length; i++) {
                pointIndices = pointIndices.concat(trace._indexToPoints[pts[i]]);
            }
        } else {
            pointIndices = pts;
        }

        out.pointIndices = pointIndices;
    }

    return out;
}
