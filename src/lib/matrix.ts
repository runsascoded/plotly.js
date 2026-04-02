// Inline 4x4 matrix operations (replaces gl-mat4 dependency)
function mat4Multiply(out: number[], a: number[], b: number[]): number[] {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    let b0: number, b1: number, b2: number, b3: number;
    b0 = b[0]; b1 = b[1]; b2 = b[2]; b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
}

function mat4Invert(out: number[], a: number[]): number[] | null {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if(!det) return null;
    det = 1.0 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
}

export const init2dArray = function(rowLength: number, colLength: number): any[][] {
    const array = new Array(rowLength);
    for(let i = 0; i < rowLength; i++) array[i] = new Array(colLength);
    return array;
};

export const transposeRagged = function(z: any[][]): any[][] {
    let maxlen = 0;
    const zlen = z.length;
    let i: number, j: number;
    // Maximum row length:
    for(i = 0; i < zlen; i++) maxlen = Math.max(maxlen, z[i].length);

    const t = new Array(maxlen);
    for(i = 0; i < maxlen; i++) {
        t[i] = new Array(zlen);
        for(j = 0; j < zlen; j++) t[i][j] = z[j][i];
    }

    return t;
};

export const dot = function(x: any, y: any): any {
    if(!(x.length && y.length) || x.length !== y.length) return null;

    const len = x.length;
    let out: any;
    let i: number;

    if(x[0].length) {
        // mat-vec or mat-mat
        out = new Array(len);
        for(i = 0; i < len; i++) out[i] = dot(x[i], y);
    } else if(y[0].length) {
        // vec-mat
        const yTranspose = transposeRagged(y);
        out = new Array(yTranspose.length);
        for(i = 0; i < yTranspose.length; i++) out[i] = dot(x, yTranspose[i]);
    } else {
        // vec-vec
        out = 0;
        for(i = 0; i < len; i++) out += x[i] * y[i];
    }

    return out;
};

export const translationMatrix = function(x: number, y: number): number[][] {
    return [[1, 0, x], [0, 1, y], [0, 0, 1]];
};

export const rotationMatrix = function(alpha: number): number[][] {
    const a = alpha * Math.PI / 180;
    return [[Math.cos(a), -Math.sin(a), 0],
            [Math.sin(a), Math.cos(a), 0],
            [0, 0, 1]];
};

export const rotationXYMatrix = function(a: number, x: number, y: number): any {
    return dot(
        dot(translationMatrix(x, y),
                    rotationMatrix(a)),
        translationMatrix(-x, -y));
};

export const apply3DTransform = function(transform: any): (...args: any[]) => number[] {
    return function() {
        const args = arguments;
        const xyz = arguments.length === 1 ? args[0] : [args[0], args[1], args[2] || 0];
        return dot(transform, [xyz[0], xyz[1], xyz[2], 1]).slice(0, 3);
    };
};

export const apply2DTransform = function(transform: any): (...args: any[]) => number[] {
    return function() {
        let args = arguments;
        if(args.length === 3) {
            args = args[0];
        } // from map
        const xy = arguments.length === 1 ? args[0] : [args[0], args[1]];
        return dot(transform, [xy[0], xy[1], 1]).slice(0, 2);
    };
};

export const apply2DTransform2 = function(transform: any): (xys: number[]) => number[] {
    const at = apply2DTransform(transform);
    return function(xys: number[]): number[] {
        return at(xys.slice(0, 2)).concat(at(xys.slice(2, 4)));
    };
};

export const convertCssMatrix = function(m: number[] | null | undefined): number[] {
    if(m) {
        const len = m.length;
        if(len === 16) return m;
        if(len === 6) {
            // converts a 2x3 css transform matrix to a 4x4 matrix see https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
            return [
                m[0], m[1], 0, 0,
                m[2], m[3], 0, 0,
                0, 0, 1, 0,
                m[4], m[5], 0, 1
            ];
        }
    }
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

export const inverseTransformMatrix = function(m: number[]): number[][] {
    const out: number[] = [];
    mat4Invert(out, m);
    return [
        [out[0], out[1], out[2], out[3]],
        [out[4], out[5], out[6], out[7]],
        [out[8], out[9], out[10], out[11]],
        [out[12], out[13], out[14], out[15]]
    ];
};

export { mat4Multiply, mat4Invert };
export default { init2dArray, transposeRagged, dot, translationMatrix, rotationMatrix, rotationXYMatrix, apply3DTransform, apply2DTransform, apply2DTransform2, convertCssMatrix, inverseTransformMatrix };
