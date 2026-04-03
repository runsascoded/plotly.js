import { select } from 'd3-selection';
import { dashLine, lineGroupStyle } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';
import _interactions from '../../constants/interactions.js';
const { DESELECTDIM } = _interactions;
import barStyle from '../bar/style.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;
const styleTextPoints = barStyle.styleTextPoints;
function style(gd, cd, sel) {
    const s = sel ? sel : select(gd).selectAll('g[class^="funnellayer"]').selectAll('g.trace');
    resizeText(gd, s, 'funnel');
    s.style('opacity', function (d) { return d[0].trace.opacity; });
    s.each(function (d) {
        const gTrace = select(this);
        const trace = d[0].trace;
        gTrace.selectAll('.point > path').each(function (di) {
            if (!di.isBlank) {
                const cont = trace.marker;
                select(this)
                    .call(Color.fill, di.mc || cont.color)
                    .call(Color.stroke, di.mlc || cont.line.color)
                    .call(dashLine, cont.line.dash, di.mlw || cont.line.width)
                    .style('opacity', trace.selectedpoints && !di.selected ? DESELECTDIM : 1);
            }
        });
        styleTextPoints(gTrace, trace, gd);
        gTrace.selectAll('.regions').each(function () {
            select(this).selectAll('path').style('stroke-width', 0).call(Color.fill, trace.connector.fillcolor);
        });
        gTrace.selectAll('.lines').each(function () {
            const cont = trace.connector.line;
            lineGroupStyle(select(this).selectAll('path'), cont.width, cont.color, cont.dash);
        });
    });
}
export default {
    style: style
};
