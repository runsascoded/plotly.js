export default function align(v, dv, v0, v1, anchor) {
    var vmin = (v - v0) / (v1 - v0);
    var vmax = vmin + dv / (v1 - v0);
    var vc = (vmin + vmax) / 2;

    // explicitly specified anchor
    if(anchor === 'left' || anchor === 'bottom') return vmin;
    if(anchor === 'center' || anchor === 'middle') return vc;
    if(anchor === 'right' || anchor === 'top') return vmax;

    // automatic based on position
    if(vmin < (2 / 3) - vc) return vmin;
    if(vmax > (4 / 3) - vc) return vmax;
    return vc;
}
