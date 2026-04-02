export default function(gd, trace) {
    const n = gd._fullData.length;
    let firstAxis;
    for(let i = 0; i < n; i++) {
        const maybeCarpet = gd._fullData[i];

        if(maybeCarpet.index === trace.index) continue;

        if(maybeCarpet.type === 'carpet') {
            if(!firstAxis) {
                firstAxis = maybeCarpet;
            }

            if(maybeCarpet.carpet === trace.carpet) {
                return maybeCarpet;
            }
        }
    }

    return firstAxis;
}
