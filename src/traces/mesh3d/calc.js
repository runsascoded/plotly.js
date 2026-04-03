import colorscaleCalc from '../../components/colorscale/calc.js';
export default function calc(gd, trace) {
    if (trace.intensity) {
        colorscaleCalc(gd, trace, {
            vals: trace.intensity,
            containerStr: '',
            cLetter: 'c'
        });
    }
}
