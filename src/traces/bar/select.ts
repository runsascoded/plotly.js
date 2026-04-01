import type { CalcDatum, FullAxis } from '../../../types/core';

export default function selectPoints(searchInfo: any, selectionTester: any): any[] {
    var cd: CalcDatum[] = searchInfo.cd;
    var xa: FullAxis = searchInfo.xaxis;
    var ya: FullAxis = searchInfo.yaxis;
    var trace = cd[0].trace;
    var isFunnel = (trace.type === 'funnel');
    var isHorizontal = (trace.orientation === 'h');
    var selection = [];
    var i;

    if(selectionTester === false) {
        // clear selection
        for(i = 0; i < cd.length; i++) {
            cd[i].selected = 0;
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            var di = cd[i];
            var ct = 'ct' in di ? di.ct : getCentroid(di, xa, ya, isHorizontal, isFunnel);

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
    var x0 = xa.c2p(isHorizontal ? d.s0 : d.p0, true);
    var x1 = xa.c2p(isHorizontal ? d.s1 : d.p1, true);
    var y0 = ya.c2p(isHorizontal ? d.p0 : d.s0, true);
    var y1 = ya.c2p(isHorizontal ? d.p1 : d.s1, true);

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
