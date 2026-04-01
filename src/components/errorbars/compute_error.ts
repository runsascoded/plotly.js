export default function makeComputeError(opts: any): (dataPt: number, index?: number) => [number, number] {
    var type = opts.type;
    var symmetric = opts.symmetric;

    if(type === 'data') {
        var array = opts.array || [];

        if(symmetric) {
            return function computeError(dataPt: number, index?: number): [number, number] {
                var val = +(array[index!]);
                return [val, val];
            };
        } else {
            var arrayminus = opts.arrayminus || [];
            return function computeError(dataPt: number, index?: number): [number, number] {
                var val = +array[index!];
                var valMinus = +arrayminus[index!];
                if(!isNaN(val) || !isNaN(valMinus)) {
                    return [valMinus || 0, val || 0];
                }
                return [NaN, NaN];
            };
        }
    } else {
        var computeErrorValue = makeComputeErrorValue(type, opts.value);
        var computeErrorValueMinus = makeComputeErrorValue(type, opts.valueminus);

        if(symmetric || opts.valueminus === undefined) {
            return function computeError(dataPt: number): [number, number] {
                var val = computeErrorValue(dataPt);
                return [val, val];
            };
        } else {
            return function computeError(dataPt: number): [number, number] {
                return [
                    computeErrorValueMinus(dataPt),
                    computeErrorValue(dataPt)
                ];
            };
        }
    }
}

function makeComputeErrorValue(type: string, value: number): (dataPt: number) => number {
    if(type === 'percent') {
        return function(dataPt: number): number {
            return Math.abs(dataPt * value / 100);
        };
    }
    if(type === 'constant') {
        return function(): number {
            return Math.abs(value);
        };
    }
    if(type === 'sqrt') {
        return function(dataPt: number): number {
            return Math.sqrt(Math.abs(dataPt));
        };
    }
    return function(): number { return 0; };
}
