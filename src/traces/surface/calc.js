import colorscaleCalc from '../../components/colorscale/calc.js';

export default function calc(gd, trace) {
    if(trace.surfacecolor) {
        colorscaleCalc(gd, trace, {
            vals: trace.surfacecolor,
            containerStr: '',
            cLetter: 'c'
        });
    } else {
        colorscaleCalc(gd, trace, {
            vals: trace.z,
            containerStr: '',
            cLetter: 'c'
        });
    }
}
