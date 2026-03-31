import isNumeric from 'fast-isnumeric';

export default function makeBubbleSizeFn(trace: any, factor?: number): (v: any) => number {
    if(!factor) {
        factor = 2;
    }
    var marker = trace.marker;
    var sizeRef = marker.sizeref || 1;
    var sizeMin = marker.sizemin || 0;

    // for bubble charts, allow scaling the provided value linearly
    // and by area or diameter.
    // Note this only applies to the array-value sizes

    var baseFn = (marker.sizemode === 'area') ?
        function(v) { return Math.sqrt(v / sizeRef); } :
        function(v) { return v / sizeRef; };

    // TODO add support for position/negative bubbles?
    // TODO add 'sizeoffset' attribute?
    return function(v) {
        var baseSize = baseFn(v / factor);

        // don't show non-numeric and negative sizes
        return (isNumeric(baseSize) && (baseSize > 0)) ?
            Math.max(baseSize, sizeMin) :
            0;
    };
}
