export default function selectPoints(searchInfo: any,  selectionTester: any) {
    const cd = searchInfo.cd;
    const xa = searchInfo.xaxis;
    const ya = searchInfo.yaxis;
    const selection: any[] = [];
    let i;
    // for (potentially grouped) candlesticks
    const posOffset = cd[0].t.bPos || 0;

    if(selectionTester === false) {
        // clear selection
        for(i = 0; i < cd.length; i++) {
            cd[i].selected = 0;
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            const di = cd[i];

            if(selectionTester.contains([xa.c2p(di.pos + posOffset), ya.c2p(di.yc)], null, di.i, searchInfo)) {
                selection.push({
                    pointNumber: di.i,
                    x: xa.c2d(di.pos),
                    y: ya.c2d(di.yc)
                });
                di.selected = 1;
            } else {
                di.selected = 0;
            }
        }
    }

    return selection;
}
