import Axes from '../../plots/cartesian/axes.js';
import { extendFlat } from '../../lib/extend.js';
export default function calcLabels(trace, axis) {
    let i, tobj, prefix, suffix, gridline;
    const labels = axis._labels = [];
    const gridlines = axis._gridlines;
    for (i = 0; i < gridlines.length; i++) {
        gridline = gridlines[i];
        if (['start', 'both'].indexOf(axis.showticklabels) !== -1) {
            tobj = Axes.tickText(axis, gridline.value);
            extendFlat(tobj, {
                prefix: prefix,
                suffix: suffix,
                endAnchor: true,
                xy: gridline.xy(0),
                dxy: gridline.dxy(0, 0),
                axis: gridline.axis,
                length: gridline.crossAxis.length,
                font: gridline.axis.tickfont,
                isFirst: i === 0,
                isLast: i === gridlines.length - 1
            });
            labels.push(tobj);
        }
        if (['end', 'both'].indexOf(axis.showticklabels) !== -1) {
            tobj = Axes.tickText(axis, gridline.value);
            extendFlat(tobj, {
                endAnchor: false,
                xy: gridline.xy(gridline.crossLength - 1),
                dxy: gridline.dxy(gridline.crossLength - 2, 1),
                axis: gridline.axis,
                length: gridline.crossAxis.length,
                font: gridline.axis.tickfont,
                isFirst: i === 0,
                isLast: i === gridlines.length - 1
            });
            labels.push(tobj);
        }
    }
}
