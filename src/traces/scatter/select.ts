import type { CalcDatum, FullAxis } from '../../../types/core';
import subtypes from './subtypes.js';

export default function selectPoints(searchInfo: any, selectionTester: any): any[] {
    const cd: CalcDatum[] = searchInfo.cd;
    const xa: FullAxis = searchInfo.xaxis;
    const ya: FullAxis = searchInfo.yaxis;
    const selection: any[] = [];
    const trace = cd[0].trace;
    let i;
    let di;
    let x;
    let y;

    const hasOnlyLines = (!subtypes.hasMarkers(trace) && !subtypes.hasText(trace));
    if(hasOnlyLines) return [];

    if(selectionTester === false) { // clear selection
        for(i = 0; i < cd.length; i++) {
            cd[i].selected = 0;
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            di = cd[i];
            x = xa.c2p(di.x);
            y = ya.c2p(di.y);

            if((di.i !== null) && selectionTester.contains([x, y], false, i, searchInfo)) {
                selection.push({
                    pointNumber: di.i,
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
