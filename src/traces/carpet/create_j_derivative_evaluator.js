export default function (arrays, asmoothing, bsmoothing) {
    if (asmoothing && bsmoothing) {
        return function (out, i0, j0, u, v) {
            if (!out)
                out = [];
            let f0, f1, f2, f3, ak, k;
            // Since it's a grid of control points, the actual indices are * 3:
            i0 *= 3;
            j0 *= 3;
            // Precompute some numbers:
            const u2 = u * u;
            const u3 = u2 * u;
            const ou = 1 - u;
            const ou2 = ou * ou;
            const ou3 = ou2 * ou;
            const v2 = v * v;
            const ov = 1 - v;
            const ov2 = ov * ov;
            const ovv2 = ov * v * 2;
            const a = -3 * ov2;
            const b = 3 * (ov2 - ovv2);
            const c = 3 * (ovv2 - v2);
            const d = 3 * v2;
            for (k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                // Compute the derivatives in the v-direction:
                f0 = a * ak[j0][i0] + b * ak[j0 + 1][i0] + c * ak[j0 + 2][i0] + d * ak[j0 + 3][i0];
                f1 = a * ak[j0][i0 + 1] + b * ak[j0 + 1][i0 + 1] + c * ak[j0 + 2][i0 + 1] + d * ak[j0 + 3][i0 + 1];
                f2 = a * ak[j0][i0 + 2] + b * ak[j0 + 1][i0 + 2] + c * ak[j0 + 2][i0 + 2] + d * ak[j0 + 3][i0 + 2];
                f3 = a * ak[j0][i0 + 3] + b * ak[j0 + 1][i0 + 3] + c * ak[j0 + 2][i0 + 3] + d * ak[j0 + 3][i0 + 3];
                // Now just interpolate in the v-direction since it's all separable:
                out[k] = ou3 * f0 + 3 * (ou2 * u * f1 + ou * u2 * f2) + u3 * f3;
            }
            return out;
        };
    }
    else if (asmoothing) {
        // Handle smooth in the a-direction but linear in the b-direction by performing four
        // linear interpolations followed by one cubic interpolation of the result
        return function (out, i0, j0, v, u) {
            if (!out)
                out = [];
            let f0, f1, f2, f3, k, ak;
            i0 *= 3;
            const u2 = u * u;
            const u3 = u2 * u;
            const ou = 1 - u;
            const ou2 = ou * ou;
            const ou3 = ou2 * ou;
            for (k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ak[j0 + 1][i0] - ak[j0][i0];
                f1 = ak[j0 + 1][i0 + 1] - ak[j0][i0 + 1];
                f2 = ak[j0 + 1][i0 + 2] - ak[j0][i0 + 2];
                f3 = ak[j0 + 1][i0 + 3] - ak[j0][i0 + 3];
                out[k] = ou3 * f0 + 3 * (ou2 * u * f1 + ou * u2 * f2) + u3 * f3;
                // mathematically equivalent:
                // f0 = ou3 * ak[j0    ][i0] + 3 * (ou2 * u * ak[j0    ][i0 + 1] + ou * u2 * ak[j0    ][i0 + 2]) + u3 * ak[j0    ][i0 + 3];
                // f1 = ou3 * ak[j0 + 1][i0] + 3 * (ou2 * u * ak[j0 + 1][i0 + 1] + ou * u2 * ak[j0 + 1][i0 + 2]) + u3 * ak[j0 + 1][i0 + 3];
                // out[k] = f1 - f0;
            }
            return out;
        };
    }
    else if (bsmoothing) {
        // Same as the above case, except reversed:
        return function (out, i0, j0, u, v) {
            if (!out)
                out = [];
            let f0, f1, k, ak;
            j0 *= 3;
            const ou = 1 - u;
            const v2 = v * v;
            const ov = 1 - v;
            const ov2 = ov * ov;
            const ovv2 = ov * v * 2;
            const a = -3 * ov2;
            const b = 3 * (ov2 - ovv2);
            const c = 3 * (ovv2 - v2);
            const d = 3 * v2;
            for (k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = a * ak[j0][i0] + b * ak[j0 + 1][i0] + c * ak[j0 + 2][i0] + d * ak[j0 + 3][i0];
                f1 = a * ak[j0][i0 + 1] + b * ak[j0 + 1][i0 + 1] + c * ak[j0 + 2][i0 + 1] + d * ak[j0 + 3][i0 + 1];
                out[k] = ou * f0 + u * f1;
            }
            return out;
        };
    }
    else {
        // Finally, both directions are linear:
        return function (out, i0, j0, v, u) {
            if (!out)
                out = [];
            let f0, f1, k, ak;
            const ov = 1 - v;
            for (k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ak[j0 + 1][i0] - ak[j0][i0];
                f1 = ak[j0 + 1][i0 + 1] - ak[j0][i0 + 1];
                out[k] = ov * f0 + v * f1;
            }
            return out;
        };
    }
}
