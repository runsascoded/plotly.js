import Lib from '../../lib/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import alignPeriod from '../../plots/cartesian/align_period.js';

export default function convertColumnData(trace: any,  ax1: any,  ax2: any,  var1Name: any,  var2Name: any,  arrayVarNames: any) {
    const colLen = trace._length;
    let col1 = ax1.makeCalcdata(trace, var1Name);
    let col2 = ax2.makeCalcdata(trace, var2Name);
    col1 = alignPeriod(trace, ax1, var1Name, col1).vals;
    col2 = alignPeriod(trace, ax2, var2Name, col2).vals;

    const textCol = trace.text;
    const hasColumnText = (textCol !== undefined && Lib.isArray1D(textCol));
    const hoverTextCol = trace.hovertext;
    const hasColumnHoverText = (hoverTextCol !== undefined && Lib.isArray1D(hoverTextCol));
    let i, j;

    const col1dv = Lib.distinctVals(col1);
    const col1vals = col1dv.vals;
    const col2dv = Lib.distinctVals(col2);
    const col2vals = col2dv.vals;
    const newArrays: any[] = [];
    let text;
    let hovertext;

    const nI = col2vals.length;
    const nJ = col1vals.length;

    for(i = 0; i < arrayVarNames.length; i++) {
        newArrays[i] = (Lib.init2dArray(nI, nJ) as any);
    }

    if(hasColumnText) {
        text = Lib.init2dArray(nI, nJ);
    }
    if(hasColumnHoverText) {
        hovertext = Lib.init2dArray(nI, nJ);
    }

    const after2before = Lib.init2dArray(nI, nJ);

    for(i = 0; i < colLen; i++) {
        if(col1[i] !== BADNUM && col2[i] !== BADNUM) {
            const i1 = Lib.findBin(col1[i] + col1dv.minDiff / 2, col1vals);
            const i2 = Lib.findBin(col2[i] + col2dv.minDiff / 2, col2vals);

            for(j = 0; j < arrayVarNames.length; j++) {
                const arrayVarName = arrayVarNames[j];
                const arrayVar = trace[arrayVarName];
                const newArray = newArrays[j];
                newArray[i2][i1] = (arrayVar[i] as any);
                after2before[i2][i1] = i;
            }

            if(hasColumnText) text[i2][i1] = textCol[i];
            if(hasColumnHoverText) hovertext[i2][i1] = hoverTextCol[i];
        }
    }

    trace['_' + var1Name] = col1vals;
    trace['_' + var2Name] = col2vals;
    for(j = 0; j < arrayVarNames.length; j++) {
        trace['_' + arrayVarNames[j]] = newArrays[j];
    }
    if(hasColumnText) trace._text = text;
    if(hasColumnHoverText) trace._hovertext = hovertext;

    if(ax1 && ax1.type === 'category') {
        trace['_' + var1Name + 'CategoryMap'] = col1vals.map((v: any) => ax1._categories[v]);
    }

    if(ax2 && ax2.type === 'category') {
        trace['_' + var2Name + 'CategoryMap'] = col2vals.map((v: any) => ax2._categories[v]);
    }

    trace._after2before = after2before;
}
