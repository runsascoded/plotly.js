import type { FullAxis } from '../../../types/core';

export default function selectPoints(searchInfo: any, selectionTester: any): any[] {
    const cd = searchInfo.cd;
    const xa = searchInfo.xaxis;
    const ya = searchInfo.yaxis;
    const selection = [];
    let i, j;

    if(selectionTester === false) {
        for(i = 0; i < cd.length; i++) {
            for(j = 0; j < (cd[i].pts || []).length; j++) {
                // clear selection
                cd[i].pts[j].selected = 0;
            }
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            for(j = 0; j < (cd[i].pts || []).length; j++) {
                const pt = cd[i].pts[j];
                const x = xa.c2p(pt.x);
                const y = ya.c2p(pt.y);

                if(selectionTester.contains([x, y], null, pt.i, searchInfo)) {
                    selection.push({
                        pointNumber: pt.i,
                        x: xa.c2d(pt.x),
                        y: ya.c2d(pt.y)
                    });
                    pt.selected = 1;
                } else {
                    pt.selected = 0;
                }
            }
        }
    }

    return selection;
}
