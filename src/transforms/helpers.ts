export function pointsAccessorFunction(transforms: any, opts: any) {
    let tr;
    let prevIndexToPoints;
    for(let i = 0; i < transforms.length; i++) {
        tr = transforms[i];
        if(tr === opts) break;
        if(!tr._indexToPoints || tr.enabled === false) continue;
        prevIndexToPoints = tr._indexToPoints;
    }
    const originalPointsAccessor = prevIndexToPoints ?
        function(i: any) {return prevIndexToPoints[i];} :
        function(i: any) {return [i];};
    return originalPointsAccessor;
}

export default { pointsAccessorFunction };
