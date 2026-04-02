import subtypes from '../scatter/subtypes.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

export default function selectPoints(searchInfo: any, selectionTester: any) {
    const cd = searchInfo.cd;
    const xa = searchInfo.xaxis;
    const ya = searchInfo.yaxis;
    const selection: any[] = [];
    const trace = cd[0].trace;

    let di, lonlat, x, y, i;

    const hasOnlyLines = (!subtypes.hasMarkers(trace) && !subtypes.hasText(trace));
    if(hasOnlyLines) return [];

    if(selectionTester === false) {
        for(i = 0; i < cd.length; i++) {
            cd[i].selected = 0;
        }
    } else {
        for(i = 0; i < cd.length; i++) {
            di = cd[i];
            lonlat = di.lonlat;

            // some projection types can't handle BADNUMs
            if(lonlat[0] === BADNUM) continue;

            x = xa.c2p(lonlat);
            y = ya.c2p(lonlat);

            if(selectionTester.contains([x, y], null, i, searchInfo)) {
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

    return selection;
}
