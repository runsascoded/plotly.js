import { makeComputeError } from '../../components/errorbars/index.js';

function calculateAxisErrors(data: any, params: any, scaleFactor: any, axis: any) {
    if(!params || !params.visible) return null;

    const computeError = makeComputeError(params);
    const result = new Array(data.length);

    for(let i = 0; i < data.length; i++) {
        const errors = computeError(+data[i], i);

        if(axis.type === 'log') {
            const point = axis.c2l(data[i]);
            const min = data[i] - errors[0];
            const max = data[i] + errors[1];

            result[i] = [
                (axis.c2l(min, true) - point) * scaleFactor,
                (axis.c2l(max, true) - point) * scaleFactor
            ];

            // Keep track of the lower error bound which isn't negative!
            if(min > 0) {
                const lower = axis.c2l(min);
                if(!axis._lowerLogErrorBound) axis._lowerLogErrorBound = lower;
                axis._lowerErrorBound = Math.min(axis._lowerLogErrorBound, lower);
            }
        } else {
            result[i] = [
                -errors[0] * scaleFactor,
                errors[1] * scaleFactor
            ];
        }
    }

    return result;
}

function dataLength(array: any) {
    for(let i = 0; i < array.length; i++) {
        if(array[i]) return array[i].length;
    }
    return 0;
}

function calculateErrors(data: any, scaleFactor: any, sceneLayout: any) {
    const errors = [
        calculateAxisErrors(data.x, data.error_x, scaleFactor[0], sceneLayout.xaxis),
        calculateAxisErrors(data.y, data.error_y, scaleFactor[1], sceneLayout.yaxis),
        calculateAxisErrors(data.z, data.error_z, scaleFactor[2], sceneLayout.zaxis)
    ];

    const n = dataLength(errors);
    if(n === 0) return null;

    const errorBounds = new Array(n);

    for(let i = 0; i < n; i++) {
        const bound = [[0, 0, 0], [0, 0, 0]];

        for(let j = 0; j < 3; j++) {
            if(errors[j]) {
                for(let k = 0; k < 2; k++) {
                    bound[k][j] = errors[j]![i][k];
                }
            }
        }

        errorBounds[i] = bound;
    }

    return errorBounds;
}

export default calculateErrors;
