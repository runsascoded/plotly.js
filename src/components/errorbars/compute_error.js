export default function makeComputeError(opts) {
    const type = opts.type;
    const symmetric = opts.symmetric;
    if (type === 'data') {
        const array = opts.array || [];
        if (symmetric) {
            return function computeError(dataPt, index) {
                const val = +(array[index]);
                return [val, val];
            };
        }
        else {
            const arrayminus = opts.arrayminus || [];
            return function computeError(dataPt, index) {
                const val = +array[index];
                const valMinus = +arrayminus[index];
                if (!isNaN(val) || !isNaN(valMinus)) {
                    return [valMinus || 0, val || 0];
                }
                return [NaN, NaN];
            };
        }
    }
    else {
        const computeErrorValue = makeComputeErrorValue(type, opts.value);
        const computeErrorValueMinus = makeComputeErrorValue(type, opts.valueminus);
        if (symmetric || opts.valueminus === undefined) {
            return function computeError(dataPt) {
                const val = computeErrorValue(dataPt);
                return [val, val];
            };
        }
        else {
            return function computeError(dataPt) {
                return [
                    computeErrorValueMinus(dataPt),
                    computeErrorValue(dataPt)
                ];
            };
        }
    }
}
function makeComputeErrorValue(type, value) {
    if (type === 'percent') {
        return function (dataPt) {
            return Math.abs(dataPt * value / 100);
        };
    }
    if (type === 'constant') {
        return function () {
            return Math.abs(value);
        };
    }
    if (type === 'sqrt') {
        return function (dataPt) {
            return Math.sqrt(Math.abs(dataPt));
        };
    }
    return function () { return 0; };
}
