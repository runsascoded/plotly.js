import type { GraphDiv, FullTrace } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import { aggNums, nestedProperty } from '../../lib/index.js';
import _helpers from './helpers.js';
const { extractOpts } = _helpers;

export default function calc(gd: GraphDiv, trace: FullTrace, opts: any): void {
    var fullLayout = gd._fullLayout;
    var vals = opts.vals;
    var containerStr = opts.containerStr;

    var container = containerStr ?
        nestedProperty(trace, containerStr).get() :
        trace;

    var cOpts = extractOpts(container);
    var auto = cOpts.auto !== false;
    var min = cOpts.min;
    var max = cOpts.max;
    var mid = cOpts.mid;

    var minVal = function(): number { return aggNums(Math.min, null, vals); };
    var maxVal = function(): number { return aggNums(Math.max, null, vals); };

    if(min === undefined) {
        min = minVal();
    } else if(auto) {
        if(container._colorAx && isNumeric(min)) {
            min = Math.min(min, minVal());
        } else {
            min = minVal();
        }
    }

    if(max === undefined) {
        max = maxVal();
    } else if(auto) {
        if(container._colorAx && isNumeric(max)) {
            max = Math.max(max, maxVal());
        } else {
            max = maxVal();
        }
    }

    if(auto && mid !== undefined) {
        if(max - mid > mid - min) {
            min = mid - (max - mid);
        } else if(max - mid < mid - min) {
            max = mid + (mid - min);
        }
    }

    if(min === max) {
        min -= 0.5;
        max += 0.5;
    }

    cOpts._sync('min', min);
    cOpts._sync('max', max);

    if(cOpts.autocolorscale) {
        var scl;
        if(min * max < 0) scl = fullLayout.colorscale.diverging;
        else if(min >= 0) scl = fullLayout.colorscale.sequential;
        else scl = fullLayout.colorscale.sequentialminus;
        cOpts._sync('colorscale', scl);
    }
}
