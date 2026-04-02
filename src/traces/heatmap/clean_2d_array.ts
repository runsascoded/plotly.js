import type { FullAxis, FullTrace } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

export default function clean2dArray(zOld: any,  trace?: FullTrace,  xa?: FullAxis,  ya?: FullAxis) {
    let rowlen, collen, getCollen, old2new, i, j;

    function cleanZvalue(v) {
        if(!isNumeric(v)) return undefined;
        return +v;
    }

    if(trace && trace.transpose) {
        rowlen = 0;
        for(i = 0; i < zOld.length; i++) rowlen = Math.max(rowlen, zOld[i].length);
        if(rowlen === 0) return false;
        getCollen = function(zOld) { return zOld.length; };
        old2new = function(zOld, i, j) { return (zOld[j] || [])[i]; };
    } else {
        rowlen = zOld.length;
        getCollen = function(zOld, i) { return zOld[i].length; };
        old2new = function(zOld, i, j) { return (zOld[i] || [])[j]; };
    }

    const padOld2new = function(zOld,  i,  j) {
        if(i === BADNUM || j === BADNUM) return BADNUM;
        return old2new(zOld, i, j);
    };

    function axisMapping(ax: FullAxis) {
        if(trace && trace.type !== 'carpet' && trace.type !== 'contourcarpet' &&
            ax && ax.type === 'category' && trace['_' + ax._id.charAt(0)].length) {
            const axLetter = ax._id.charAt(0);
            const axMapping: any = {};
            const traceCategories = trace['_' + axLetter + 'CategoryMap'] || trace[axLetter];
            for(i = 0; i < traceCategories.length; i++) {
                axMapping[traceCategories[i]] = i;
            }
            return function(i) {
                const ind = axMapping[ax._categories[i]];
                return ind + 1 ? ind : BADNUM;
            };
        } else {
            return Lib.identity;
        }
    }

    const xMap = axisMapping(xa);
    const yMap = axisMapping(ya);

    if(ya && ya.type === 'category') rowlen = ya._categories.length;
    const zNew = new Array(rowlen);

    for(i = 0; i < rowlen; i++) {
        if(xa && xa.type === 'category') {
            collen = xa._categories.length;
        } else {
            collen = getCollen(zOld, i);
        }
        zNew[i] = new Array(collen);
        for(j = 0; j < collen; j++) zNew[i][j] = cleanZvalue(padOld2new(zOld, yMap(i), xMap(j)));
    }

    return zNew;
}
