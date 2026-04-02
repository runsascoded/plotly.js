import type { FullTrace } from '../../../types/core';
export default function eventData(out: any,  pt: any /*,  trace: FullTrace,  cd,  pointNumber */) {
    // standard cartesian event data
    out.x = 'xVal' in pt ? pt.xVal : pt.x;
    out.y = 'yVal' in pt ? pt.yVal : pt.y;

    // for funnel
    if('percentInitial' in pt) out.percentInitial = pt.percentInitial;
    if('percentPrevious' in pt) out.percentPrevious = pt.percentPrevious;
    if('percentTotal' in pt) out.percentTotal = pt.percentTotal;

    if(pt.xa) out.xaxis = pt.xa;
    if(pt.ya) out.yaxis = pt.ya;

    return out;
}
