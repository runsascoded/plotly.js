import { select } from 'd3-selection';
import Color from '../color/index.js';
import ARROWPATHS from './arrow_paths.js';
import Lib from '../../lib/index.js';
const strScale = Lib.strScale;
const strRotate = Lib.strRotate;
const strTranslate = Lib.strTranslate;
export default function drawArrowHead(el3, ends, options) {
    const el = el3.node();
    const headStyle = ARROWPATHS[options.arrowhead || 0];
    const startHeadStyle = ARROWPATHS[options.startarrowhead || 0];
    const scale = (options.arrowwidth || 1) * (options.arrowsize || 1);
    const startScale = (options.arrowwidth || 1) * (options.startarrowsize || 1);
    const doStart = ends.indexOf('start') >= 0;
    const doEnd = ends.indexOf('end') >= 0;
    const backOff = headStyle.backoff * scale + options.standoff;
    const startBackOff = startHeadStyle.backoff * startScale + options.startstandoff;
    let start, end, startRot, endRot;
    if (el.nodeName === 'line') {
        start = { x: +el3.attr('x1'), y: +el3.attr('y1') };
        end = { x: +el3.attr('x2'), y: +el3.attr('y2') };
        const dx = start.x - end.x;
        const dy = start.y - end.y;
        startRot = Math.atan2(dy, dx);
        endRot = startRot + Math.PI;
        if (backOff && startBackOff) {
            if (backOff + startBackOff > Math.sqrt(dx * dx + dy * dy)) {
                hideLine();
                return;
            }
        }
        if (backOff) {
            if (backOff * backOff > dx * dx + dy * dy) {
                hideLine();
                return;
            }
            const backOffX = backOff * Math.cos(startRot);
            const backOffY = backOff * Math.sin(startRot);
            end.x += backOffX;
            end.y += backOffY;
            el3
                .attr('x2', end.x)
                .attr('y2', end.y);
        }
        if (startBackOff) {
            if (startBackOff * startBackOff > dx * dx + dy * dy) {
                hideLine();
                return;
            }
            const startBackOffX = startBackOff * Math.cos(startRot);
            const startbackOffY = startBackOff * Math.sin(startRot);
            start.x -= startBackOffX;
            start.y -= startbackOffY;
            el3
                .attr('x1', start.x)
                .attr('y1', start.y);
        }
    }
    else if (el.nodeName === 'path') {
        const pathlen = el.getTotalLength();
        // using dash to hide the backOff region of the path.
        // if we ever allow dash for the arrow we'll have to
        // do better than this hack... maybe just manually
        // combine the two
        let dashArray = '';
        if (pathlen < backOff + startBackOff) {
            hideLine();
            return;
        }
        const start0 = el.getPointAtLength(0);
        const dstart = el.getPointAtLength(0.1);
        startRot = Math.atan2(start0.y - dstart.y, start0.x - dstart.x);
        start = el.getPointAtLength(Math.min(startBackOff, pathlen));
        dashArray = '0px,' + startBackOff + 'px,';
        const end0 = el.getPointAtLength(pathlen);
        const dend = el.getPointAtLength(pathlen - 0.1);
        endRot = Math.atan2(end0.y - dend.y, end0.x - dend.x);
        end = el.getPointAtLength(Math.max(0, pathlen - backOff));
        const shortening = dashArray ? startBackOff + backOff : backOff;
        dashArray += (pathlen - shortening) + 'px,' + pathlen + 'px';
        el3.style('stroke-dasharray', dashArray);
    }
    function hideLine() { el3.style('stroke-dasharray', '0px,100px'); }
    function drawhead(arrowHeadStyle, p, rot, arrowScale) {
        if (!arrowHeadStyle.path)
            return;
        if (arrowHeadStyle.noRotate)
            rot = 0;
        select(el.parentNode).append('path')
            .attr('class', el3.attr('class'))
            .attr('d', arrowHeadStyle.path)
            .attr('transform', strTranslate(p.x, p.y) +
            strRotate(rot * 180 / Math.PI) +
            strScale(arrowScale))
            .style('fill', Color.rgb(options.arrowcolor))
            .style('stroke-width', 0);
    }
    if (doStart)
        drawhead(startHeadStyle, start, startRot, startScale);
    if (doEnd)
        drawhead(headStyle, end, endRot, scale);
}
