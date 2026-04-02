import type { CalcDatum, FullAxis } from '../../../types/core';

export default function selectPoints(searchInfo: any, selectionTester: any): any[] {
    const cd: CalcDatum[] = searchInfo.cd;
    const xa: FullAxis = searchInfo.xaxis;
    const ya: FullAxis = searchInfo.yaxis;
    const trace = cd[0].trace;
    const isFunnel = (trace.type === 'funnel');
    const isHorizontal = (trace.orientation === 'h');
    const selection = [];
    let i;

    if(selectionTester === false) {
        // clear selection
        for(i = 0; i < cd.length; i++) {
            cd[i].selected = 0;
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            const di = cd[i];
            const ct = 'ct' in di ? di.ct : getCentroid(di, xa, ya, isHorizontal, isFunnel);

            if(selectionTester.contains(ct, false, i, searchInfo)) {
                selection.push({
                    pointNumber: i,
                    x: xa.c2d(di.x),
                    y: ya.c2d(di.y)
                });
                di.selected = 1;
            } else {
                di.selected = 0;
            }
        }
    }

    return selection;
}

function getCentroid(d: any, xa: FullAxis, ya: FullAxis, isHorizontal: boolean, isFunnel: boolean): number[] {
    const x0 = xa.c2p(isHorizontal ? d.s0 : d.p0, true);
    const x1 = xa.c2p(isHorizontal ? d.s1 : d.p1, true);
    const y0 = ya.c2p(isHorizontal ? d.p0 : d.s0, true);
    const y1 = ya.c2p(isHorizontal ? d.p1 : d.s1, true);

    if(isFunnel) {
        return [(x0 + x1) / 2, (y0 + y1) / 2];
    } else {
        if(isHorizontal) {
            return [x1, (y0 + y1) / 2];
        } else {
            return [(x0 + x1) / 2, y1];
        }
    }
}
