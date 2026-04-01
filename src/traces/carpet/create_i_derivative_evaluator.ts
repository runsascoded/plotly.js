export default function(arrays, asmoothing, bsmoothing) {
    if(asmoothing && bsmoothing) {
        return function(out, i0, j0, u, v) {
            if(!out) out = [];
            var f0, f1, f2, f3, ak, k;

            // Since it's a grid of control points, the actual indices are * 3:
            i0 *= 3;
            j0 *= 3;

            // Precompute some numbers:
            var u2 = u * u;
            var ou = 1 - u;
            var ou2 = ou * ou;
            var ouu2 = ou * u * 2;
            var a = -3 * ou2;
            var b = 3 * (ou2 - ouu2);
            var c = 3 * (ouu2 - u2);
            var d = 3 * u2;

            var v2 = v * v;
            var v3 = v2 * v;
            var ov = 1 - v;
            var ov2 = ov * ov;
            var ov3 = ov2 * ov;

            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                // Compute the derivatives in the u-direction:
                f0 = a * ak[j0 ][i0] + b * ak[j0 ][i0 + 1] + c * ak[j0 ][i0 + 2] + d * ak[j0 ][i0 + 3];
                f1 = a * ak[j0 + 1][i0] + b * ak[j0 + 1][i0 + 1] + c * ak[j0 + 1][i0 + 2] + d * ak[j0 + 1][i0 + 3];
                f2 = a * ak[j0 + 2][i0] + b * ak[j0 + 2][i0 + 1] + c * ak[j0 + 2][i0 + 2] + d * ak[j0 + 2][i0 + 3];
                f3 = a * ak[j0 + 3][i0] + b * ak[j0 + 3][i0 + 1] + c * ak[j0 + 3][i0 + 2] + d * ak[j0 + 3][i0 + 3];

                // Now just interpolate in the v-direction since it's all separable:
                out[k] = ov3 * f0 + 3 * (ov2 * v * f1 + ov * v2 * f2) + v3 * f3;
            }

            return out;
        };
    } else if(asmoothing) {
        // Handle smooth in the a-direction but linear in the b-direction by performing four
        // linear interpolations followed by one cubic interpolation of the result
        return function(out, i0, j0, u, v) {
            if(!out) out = [];
            var f0, f1, k, ak;
            i0 *= 3;
            var u2 = u * u;
            var ou = 1 - u;
            var ou2 = ou * ou;
            var ouu2 = ou * u * 2;
            var a = -3 * ou2;
            var b = 3 * (ou2 - ouu2);
            var c = 3 * (ouu2 - u2);
            var d = 3 * u2;
            var ov = 1 - v;
            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = a * ak[j0 ][i0] + b * ak[j0 ][i0 + 1] + c * ak[j0 ][i0 + 2] + d * ak[j0 ][i0 + 3];
                f1 = a * ak[j0 + 1][i0] + b * ak[j0 + 1][i0 + 1] + c * ak[j0 + 1][i0 + 2] + d * ak[j0 + 1][i0 + 3];

                out[k] = ov * f0 + v * f1;
            }
            return out;
        };
    } else if(bsmoothing) {
        // Same as the above case, except reversed. I've disabled the no-unused vars rule
        // so that this function is fully interpolation-agnostic. Otherwise it would need
        // to be called differently in different cases. Which wouldn't be the worst, but
        /* eslint-disable no-unused-vars */
        return function(out, i0, j0, u, v) {
        /* eslint-enable no-unused-vars */
            if(!out) out = [];
            var f0, f1, f2, f3, k, ak;
            j0 *= 3;
            var v2 = v * v;
            var v3 = v2 * v;
            var ov = 1 - v;
            var ov2 = ov * ov;
            var ov3 = ov2 * ov;
            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ak[j0][i0 + 1] - ak[j0][i0];
                f1 = ak[j0 + 1][i0 + 1] - ak[j0 + 1][i0];
                f2 = ak[j0 + 2][i0 + 1] - ak[j0 + 2][i0];
                f3 = ak[j0 + 3][i0 + 1] - ak[j0 + 3][i0];

                out[k] = ov3 * f0 + 3 * (ov2 * v * f1 + ov * v2 * f2) + v3 * f3;
            }
            return out;
        };
    } else {
        // Finally, both directions are linear:
        /* eslint-disable no-unused-vars */
        return function(out, i0, j0, u, v) {
        /* eslint-enable no-unused-vars */
            if(!out) out = [];
            var f0, f1, k, ak;
            var ov = 1 - v;
            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ak[j0][i0 + 1] - ak[j0][i0];
                f1 = ak[j0 + 1][i0 + 1] - ak[j0 + 1][i0];

                out[k] = ov * f0 + v * f1;
            }
            return out;
        };
    }
}
