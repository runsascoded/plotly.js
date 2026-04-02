export default function(arrays: any, na: any, nb: any, asmoothing: any, bsmoothing: any) {
    const imax = na - 2;
    const jmax = nb - 2;

    if(asmoothing && bsmoothing) {
        return function(out: any, i: any, j: any) {
            if(!out) out = [];
            let f0, f1, f2, f3, ak, k;

            let i0 = Math.max(0, Math.min(Math.floor(i), imax));
            let j0 = Math.max(0, Math.min(Math.floor(j), jmax));
            const u = Math.max(0, Math.min(1, i - i0));
            const v = Math.max(0, Math.min(1, j - j0));

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
            const v3 = v2 * v;
            const ov = 1 - v;
            const ov2 = ov * ov;
            const ov3 = ov2 * ov;

            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ou3 * ak[j0][i0] + 3 * (ou2 * u * ak[j0][i0 + 1] + ou * u2 * ak[j0][i0 + 2]) + u3 * ak[j0][i0 + 3];
                f1 = ou3 * ak[j0 + 1][i0] + 3 * (ou2 * u * ak[j0 + 1][i0 + 1] + ou * u2 * ak[j0 + 1][i0 + 2]) + u3 * ak[j0 + 1][i0 + 3];
                f2 = ou3 * ak[j0 + 2][i0] + 3 * (ou2 * u * ak[j0 + 2][i0 + 1] + ou * u2 * ak[j0 + 2][i0 + 2]) + u3 * ak[j0 + 2][i0 + 3];
                f3 = ou3 * ak[j0 + 3][i0] + 3 * (ou2 * u * ak[j0 + 3][i0 + 1] + ou * u2 * ak[j0 + 3][i0 + 2]) + u3 * ak[j0 + 3][i0 + 3];
                out[k] = ov3 * f0 + 3 * (ov2 * v * f1 + ov * v2 * f2) + v3 * f3;
            }

            return out;
        };
    } else if(asmoothing) {
        // Handle smooth in the a-direction but linear in the b-direction by performing four
        // linear interpolations followed by one cubic interpolation of the result
        return function(out: any, i: any, j: any) {
            if(!out) out = [];

            let i0 = Math.max(0, Math.min(Math.floor(i), imax));
            const j0 = Math.max(0, Math.min(Math.floor(j), jmax));
            const u = Math.max(0, Math.min(1, i - i0));
            const v = Math.max(0, Math.min(1, j - j0));

            let f0, f1, f2, f3, k, ak;
            i0 *= 3;
            const u2 = u * u;
            const u3 = u2 * u;
            const ou = 1 - u;
            const ou2 = ou * ou;
            const ou3 = ou2 * ou;
            const ov = 1 - v;
            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ov * ak[j0][i0] + v * ak[j0 + 1][i0];
                f1 = ov * ak[j0][i0 + 1] + v * ak[j0 + 1][i0 + 1];
                f2 = ov * ak[j0][i0 + 2] + v * ak[j0 + 1][i0 + 1];
                f3 = ov * ak[j0][i0 + 3] + v * ak[j0 + 1][i0 + 1];

                out[k] = ou3 * f0 + 3 * (ou2 * u * f1 + ou * u2 * f2) + u3 * f3;
            }
            return out;
        };
    } else if(bsmoothing) {
        // Same as the above case, except reversed:
        return function(out: any, i: any, j: any) {
            if(!out) out = [];

            const i0 = Math.max(0, Math.min(Math.floor(i), imax));
            let j0 = Math.max(0, Math.min(Math.floor(j), jmax));
            const u = Math.max(0, Math.min(1, i - i0));
            const v = Math.max(0, Math.min(1, j - j0));

            let f0, f1, f2, f3, k, ak;
            j0 *= 3;
            const v2 = v * v;
            const v3 = v2 * v;
            const ov = 1 - v;
            const ov2 = ov * ov;
            const ov3 = ov2 * ov;
            const ou = 1 - u;
            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ou * ak[j0][i0] + u * ak[j0][i0 + 1];
                f1 = ou * ak[j0 + 1][i0] + u * ak[j0 + 1][i0 + 1];
                f2 = ou * ak[j0 + 2][i0] + u * ak[j0 + 2][i0 + 1];
                f3 = ou * ak[j0 + 3][i0] + u * ak[j0 + 3][i0 + 1];

                out[k] = ov3 * f0 + 3 * (ov2 * v * f1 + ov * v2 * f2) + v3 * f3;
            }
            return out;
        };
    } else {
        // Finally, both directions are linear:
        return function(out: any, i: any, j: any) {
            if(!out) out = [];

            const i0 = Math.max(0, Math.min(Math.floor(i), imax));
            const j0 = Math.max(0, Math.min(Math.floor(j), jmax));
            const u = Math.max(0, Math.min(1, i - i0));
            const v = Math.max(0, Math.min(1, j - j0));

            let f0, f1, k, ak;
            const ov = 1 - v;
            const ou = 1 - u;
            for(k = 0; k < arrays.length; k++) {
                ak = arrays[k];
                f0 = ou * ak[j0][i0] + u * ak[j0][i0 + 1];
                f1 = ou * ak[j0 + 1][i0] + u * ak[j0 + 1][i0 + 1];

                out[k] = ov * f0 + v * f1;
            }
            return out;
        };
    }
}
