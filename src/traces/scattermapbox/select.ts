import Lib from '../../lib/index.js';
import subtypes from '../scatter/subtypes.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

export default function selectPoints(searchInfo: any, selectionTester: any) {
    const cd = searchInfo.cd;
    const xa = searchInfo.xaxis;
    const ya = searchInfo.yaxis;
    const selection: any[] = [];
    const trace = cd[0].trace;
    let i;

    if(!subtypes.hasMarkers(trace)) return [];

    if(selectionTester === false) {
        for(i = 0; i < cd.length; i++) {
            cd[i].selected = 0;
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            const di = cd[i];
            const lonlat = di.lonlat;

            if(lonlat[0] !== BADNUM) {
                const lonlat2 = [Lib.modHalf(lonlat[0], 360), lonlat[1]];
                const xy = [xa.c2p(lonlat2), ya.c2p(lonlat2)];

                if(selectionTester.contains(xy, null, i, searchInfo)) {
                    selection.push({
                        pointNumber: i,
                        lon: lonlat[0],
                        lat: lonlat[1]
                    });
                    di.selected = 1;
                } else {
                    di.selected = 0;
                }
            }
        }
    }

    return selection;
}
