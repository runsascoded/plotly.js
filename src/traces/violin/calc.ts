import type { FullAxis, FullTrace, GraphDiv } from '../../../types/core';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import boxCalc from '../box/calc.js';
import helpers from './helpers.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

export default function calc(gd: GraphDiv, trace: FullTrace): any[] {
    const cd = boxCalc(gd, trace);

    if(cd[0].t.empty) return cd;

    const fullLayout = gd._fullLayout;
    const valAxis = Axes.getFromId(
        gd,
        trace[trace.orientation === 'h' ? 'xaxis' : 'yaxis']
    );

    let spanMin = Infinity;
    let spanMax = -Infinity;
    let maxKDE = 0;
    let maxCount = 0;

    for(let i = 0; i < cd.length; i++) {
        const cdi = cd[i];
        const vals = cdi.pts.map(helpers.extractVal);

        const bandwidth = cdi.bandwidth = calcBandwidth(trace, cdi, vals);
        let span = cdi.span = calcSpan(trace, cdi, valAxis, bandwidth);

        if(cdi.min === cdi.max && bandwidth === 0) {
            // if span is zero and bandwidth is zero, we want a violin with zero width
            span = cdi.span = [cdi.min, cdi.max];
            cdi.density = [{v: 1, t: span[0]}];
            cdi.bandwidth = bandwidth;
            maxKDE = Math.max(maxKDE, 1);
        } else {
            // step that well covers the bandwidth and is multiple of span distance
            const dist = span[1] - span[0];
            const n = Math.ceil(dist / (bandwidth / 3));
            const step = dist / n;

            if(!isFinite(step) || !isFinite(n)) {
                Lib.error('Something went wrong with computing the violin span');
                cd[0].t.empty = true;
                return cd;
            }

            const kde = helpers.makeKDE(cdi, trace, vals);
            // n intervals means n + 1 sample points to include both endpoints
            cdi.density = new Array(n + 1);

            for(let k = 0; k < cdi.density.length; k++) {
                const t = span[0] + k * step;
                const v = kde(t);
                cdi.density[k] = {v: v, t: t};
                maxKDE = Math.max(maxKDE, v);
            }
        }

        maxCount = Math.max(maxCount, vals.length);
        spanMin = Math.min(spanMin, span[0]);
        spanMax = Math.max(spanMax, span[1]);
    }

    const extremes = Axes.findExtremes(valAxis, [spanMin, spanMax], {padded: true});
    trace._extremes[valAxis._id] = extremes;

    if(trace.width) {
        cd[0].t.maxKDE = maxKDE;
    } else {
        const violinScaleGroupStats = fullLayout._violinScaleGroupStats;
        const scaleGroup = trace.scalegroup;
        const groupStats = violinScaleGroupStats[scaleGroup];

        if(groupStats) {
            groupStats.maxKDE = Math.max(groupStats.maxKDE, maxKDE);
            groupStats.maxCount = Math.max(groupStats.maxCount, maxCount);
        } else {
            violinScaleGroupStats[scaleGroup] = {
                maxKDE: maxKDE,
                maxCount: maxCount
            };
        }
    }

    cd[0].t.labels.kde = Lib._(gd, 'kde:');

    return cd;
}

// Default to Silveman's rule of thumb
// - https://stats.stackexchange.com/a/6671
// - https://en.wikipedia.org/wiki/Kernel_density_estimation#A_rule-of-thumb_bandwidth_estimator
// - https://github.com/statsmodels/statsmodels/blob/master/statsmodels/nonparametric/bandwidths.py
function silvermanRule(len: number, ssd: number, iqr: number): number {
    const a = Math.min(ssd, iqr / 1.349);
    return 1.059 * a * Math.pow(len, -0.2);
}

function calcBandwidth(trace: FullTrace, cdi: any, vals: number[]): number {
    const span = cdi.max - cdi.min;

    // If span is zero
    if(!span) {
        if(trace.bandwidth) {
            return trace.bandwidth;
        } else {
            // if span is zero and no bandwidth is specified
            // it returns zero bandwidth which is a special case
            return 0;
        }
    }

    // Limit how small the bandwidth can be.
    //
    // Silverman's rule of thumb can be "very" small
    // when IQR does a poor job at describing the spread
    // of the distribution.
    // We also want to limit custom bandwidths
    // to not blow up kde computations.

    if(trace.bandwidth) {
        return Math.max(trace.bandwidth, span / 1e4);
    } else {
        const len = vals.length;
        const ssd = Lib.stdev(vals, len - 1, cdi.mean);
        return Math.max(
            silvermanRule(len, ssd, cdi.q3 - cdi.q1),
            span / 100
        );
    }
}

function calcSpan(trace: FullTrace, cdi: any, valAxis: FullAxis, bandwidth: number): number[] {
    const spanmode = trace.spanmode;
    const spanIn = trace.span || [];
    const spanTight = [cdi.min, cdi.max];
    const spanLoose = [cdi.min - 2 * bandwidth, cdi.max + 2 * bandwidth];
    let spanOut;

    function calcSpanItem(index: any) {
        const s = spanIn[index];
        const sc = valAxis.type === 'multicategory' ?
            valAxis.r2c(s) :
            valAxis.d2c(s, 0, trace[cdi.valLetter + 'calendar']);
        return sc === BADNUM ? spanLoose[index] : sc;
    }

    if(spanmode === 'soft') {
        spanOut = spanLoose;
    } else if(spanmode === 'hard') {
        spanOut = spanTight;
    } else {
        spanOut = [calcSpanItem(0), calcSpanItem(1)];
    }

    // to reuse the equal-range-item block
    const dummyAx: any = {
        type: 'linear',
        range: spanOut
    };
    Axes.setConvert(dummyAx);
    dummyAx.cleanRange();

    return spanOut;
}
