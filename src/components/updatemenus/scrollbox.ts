import type { GraphDiv } from '../../../types/core';
import { zoom as d3Zoom } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import Color from '../color/index.js';
import { setTranslate, setClipUrl } from '../drawing/index.js';
import Lib from '../../lib/index.js';
export default ScrollBox;

/**
 * Helper class to setup a scroll box
 *
 * @class
 * @param           gd          Plotly's graph div
 * @param           container   Container to be scroll-boxed (as a D3 selection)
 * @param {string}  id          Id for the clip path to implement the scroll box
 */
function ScrollBox(this: any, gd: GraphDiv, container: any, id: any) {
    this.gd = gd;
    this.container = container;
    this.id = id;

    // See ScrollBox.prototype.enable for further definition
    this.position = null;  // scrollbox position
    this.translateX = null;  // scrollbox horizontal translation
    this.translateY = null;  // scrollbox vertical translation
    this.hbar = null;  // horizontal scrollbar D3 selection
    this.vbar = null;  // vertical scrollbar D3 selection

    // <rect> element to capture pointer events
    this.bg = this.container.selectAll('rect.scrollbox-bg').data([0]);

    this.bg.exit()
        .on('.drag', null)
        .on('wheel', null)
        .remove();

    this.bg.enter().append('rect')
        .classed('scrollbox-bg', true)
        .style('pointer-events', 'all')
        .attr({
            opacity: 0,
            x: 0,
            y: 0,
            width: 0,
            height: 0
        });
}

// scroll bar dimensions
ScrollBox.barWidth = 2;
ScrollBox.barLength = 20;
ScrollBox.barRadius = 2;
ScrollBox.barPad = 1;
ScrollBox.barColor = '#808BA4';

/**
 * If needed, setup a clip path and scrollbars
 *
 * @method
 * @param {Object}  position
 * @param {number}  position.l  Left side position (in pixels)
 * @param {number}  position.t  Top side (in pixels)
 * @param {number}  position.w  Width (in pixels)
 * @param {number}  position.h  Height (in pixels)
 * @param {string}  [position.direction='down']
 *                  Either 'down', 'left', 'right' or 'up'
 * @param {number}  [translateX=0]  Horizontal offset (in pixels)
 * @param {number}  [translateY=0]  Vertical offset (in pixels)
 */
ScrollBox.prototype.enable = function enable(position: any, translateX: any, translateY: any) {
    const fullLayout = this.gd._fullLayout;
    const fullWidth = fullLayout.width;
    const fullHeight = fullLayout.height;

    // compute position of scrollbox
    this.position = position;

    const l = this.position.l;
    const w = this.position.w;
    const t = this.position.t;
    const h = this.position.h;
    const direction = this.position.direction;
    let isDown = (direction === 'down');
    const isLeft = (direction === 'left');
    const isRight = (direction === 'right');
    const isUp = (direction === 'up');
    let boxW = w;
    let boxH = h;
    let boxL, boxR;
    let boxT, boxB;

    if(!isDown && !isLeft && !isRight && !isUp) {
        this.position.direction = 'down';
        isDown = true;
    }

    const isVertical = isDown || isUp;
    if(isVertical) {
        boxL = l;
        boxR = boxL + boxW;

        if(isDown) {
            // anchor to top side
            boxT = t;
            boxB = Math.min(boxT + boxH, fullHeight);
            boxH = boxB - boxT;
        } else {
            // anchor to bottom side
            boxB = t + boxH;
            boxT = Math.max(boxB - boxH, 0);
            boxH = boxB - boxT;
        }
    } else {
        boxT = t;
        boxB = boxT + boxH;

        if(isLeft) {
            // anchor to right side
            boxR = l + boxW;
            boxL = Math.max(boxR - boxW, 0);
            boxW = boxR - boxL;
        } else {
            // anchor to left side
            boxL = l;
            boxR = Math.min(boxL + boxW, fullWidth);
            boxW = boxR - boxL;
        }
    }

    this._box = {
        l: boxL,
        t: boxT,
        w: boxW,
        h: boxH
    };

    // compute position of horizontal scroll bar
    const needsHorizontalScrollBar = (w > boxW);
    const hbarW = ScrollBox.barLength + 2 * ScrollBox.barPad;
    const hbarH = ScrollBox.barWidth + 2 * ScrollBox.barPad;
    // draw horizontal scrollbar on the bottom side
    const hbarL = l;
    let hbarT = t + h;

    if(hbarT + hbarH > fullHeight) hbarT = fullHeight - hbarH;

    const hbar = this.container.selectAll('rect.scrollbar-horizontal').data(
            (needsHorizontalScrollBar) ? [0] : []);

    hbar.exit()
        .on('.drag', null)
        .remove();

    hbar.enter().append('rect')
        .classed('scrollbar-horizontal', true)
        .call(Color.fill, ScrollBox.barColor);

    if(needsHorizontalScrollBar) {
        this.hbar = hbar.attr({
            rx: ScrollBox.barRadius,
            ry: ScrollBox.barRadius,
            x: hbarL,
            y: hbarT,
            width: hbarW,
            height: hbarH
        });

        // hbar center moves between hbarXMin and hbarXMin + hbarTranslateMax
        this._hbarXMin = hbarL + hbarW / 2;
        this._hbarTranslateMax = boxW - hbarW;
    } else {
        delete this.hbar;
        delete this._hbarXMin;
        delete this._hbarTranslateMax;
    }

    // compute position of vertical scroll bar
    const needsVerticalScrollBar = (h > boxH);
    const vbarW = ScrollBox.barWidth + 2 * ScrollBox.barPad;
    const vbarH = ScrollBox.barLength + 2 * ScrollBox.barPad;
    // draw vertical scrollbar on the right side
    let vbarL = l + w;
    const vbarT = t;

    if(vbarL + vbarW > fullWidth) vbarL = fullWidth - vbarW;

    const vbar = this.container.selectAll('rect.scrollbar-vertical').data(
            (needsVerticalScrollBar) ? [0] : []);

    vbar.exit()
        .on('.drag', null)
        .remove();

    vbar.enter().append('rect')
        .classed('scrollbar-vertical', true)
        .call(Color.fill, ScrollBox.barColor);

    if(needsVerticalScrollBar) {
        this.vbar = vbar.attr({
            rx: ScrollBox.barRadius,
            ry: ScrollBox.barRadius,
            x: vbarL,
            y: vbarT,
            width: vbarW,
            height: vbarH
        });

        // vbar center moves between vbarYMin and vbarYMin + vbarTranslateMax
        this._vbarYMin = vbarT + vbarH / 2;
        this._vbarTranslateMax = boxH - vbarH;
    } else {
        delete this.vbar;
        delete this._vbarYMin;
        delete this._vbarTranslateMax;
    }

    // setup a clip path (if scroll bars are needed)
    const clipId = this.id;
    const clipL = boxL - 0.5;
    const clipR = (needsVerticalScrollBar) ? boxR + vbarW + 0.5 : boxR + 0.5;
    const clipT = boxT - 0.5;
    const clipB = (needsHorizontalScrollBar) ? boxB + hbarH + 0.5 : boxB + 0.5;

    const clipPath = fullLayout._topdefs.selectAll('#' + clipId)
        .data((needsHorizontalScrollBar || needsVerticalScrollBar) ? [0] : []);

    clipPath.exit().remove();

    clipPath.enter()
        .append('clipPath').attr('id', clipId)
        .append('rect');

    if(needsHorizontalScrollBar || needsVerticalScrollBar) {
        this._clipRect = clipPath.select('rect').attr({
            x: Math.floor(clipL),
            y: Math.floor(clipT),
            width: Math.ceil(clipR) - Math.floor(clipL),
            height: Math.ceil(clipB) - Math.floor(clipT)
        });

        this.container.call(setClipUrl, clipId, this.gd);

        this.bg.attr({
            x: l,
            y: t,
            width: w,
            height: h
        });
    } else {
        this.bg.attr({
            width: 0,
            height: 0
        });
        this.container
            .on('wheel', null)
            .on('.drag', null)
            .call(setClipUrl, null);
        delete this._clipRect;
    }

    // set up drag listeners (if scroll bars are needed)
    if(needsHorizontalScrollBar || needsVerticalScrollBar) {
        const onBoxDrag = d3Drag()
            .on('start', function(event: any) {
                event.sourceEvent.preventDefault();
            })
            .on('drag', this._onBoxDrag.bind(this));

        this.container
            .on('wheel', null)
            .on('wheel', this._onBoxWheel.bind(this))
            .on('.drag', null)
            .call(onBoxDrag);

        const onBarDrag = d3Drag()
            .on('start', function(event: any) {
                event.sourceEvent.preventDefault();
                event.sourceEvent.stopPropagation();
            })
            .on('drag', this._onBarDrag.bind(this));

        if(needsHorizontalScrollBar) {
            this.hbar
                .on('.drag', null)
                .call(onBarDrag);
        }

        if(needsVerticalScrollBar) {
            this.vbar
                .on('.drag', null)
                .call(onBarDrag);
        }
    }

    // set scrollbox translation
    this.setTranslate(translateX, translateY);
};

/**
 * If present, remove clip-path and scrollbars
 *
 * @method
 */
ScrollBox.prototype.disable = function disable() {
    if(this.hbar || this.vbar) {
        this.bg.attr({
            width: 0,
            height: 0
        });
        this.container
            .on('wheel', null)
            .on('.drag', null)
            .call(setClipUrl, null);
        delete this._clipRect;
    }

    if(this.hbar) {
        this.hbar.on('.drag', null);
        this.hbar.remove();
        delete this.hbar;
        delete this._hbarXMin;
        delete this._hbarTranslateMax;
    }

    if(this.vbar) {
        this.vbar.on('.drag', null);
        this.vbar.remove();
        delete this.vbar;
        delete this._vbarYMin;
        delete this._vbarTranslateMax;
    }
};

/**
 * Handles scroll box drag events
 *
 * @method
 */
ScrollBox.prototype._onBoxDrag = function _onBoxDrag(event: any) {
    let translateX = this.translateX;
    let translateY = this.translateY;

    if(this.hbar) {
        translateX -= event.dx;
    }

    if(this.vbar) {
        translateY -= event.dy;
    }

    this.setTranslate(translateX, translateY);
};

/**
 * Handles scroll box wheel events
 *
 * @method
 */
ScrollBox.prototype._onBoxWheel = function _onBoxWheel(event: any) {
    let translateX = this.translateX;
    let translateY = this.translateY;

    if(this.hbar) {
        translateX += event.deltaY;
    }

    if(this.vbar) {
        translateY += event.deltaY;
    }

    this.setTranslate(translateX, translateY);
};

/**
 * Handles scroll bar drag events
 *
 * @method
 */
ScrollBox.prototype._onBarDrag = function _onBarDrag(event: any) {
    let translateX = this.translateX;
    let translateY = this.translateY;

    if(this.hbar) {
        const xMin = translateX + this._hbarXMin;
        const xMax = xMin + this._hbarTranslateMax;
        const x = Lib.constrain(event.x, xMin, xMax);
        const xf = (x - xMin) / (xMax - xMin);

        const translateXMax = this.position.w - this._box.w;

        translateX = xf * translateXMax;
    }

    if(this.vbar) {
        const yMin = translateY + this._vbarYMin;
        const yMax = yMin + this._vbarTranslateMax;
        const y = Lib.constrain(event.y, yMin, yMax);
        const yf = (y - yMin) / (yMax - yMin);

        const translateYMax = this.position.h - this._box.h;

        translateY = yf * translateYMax;
    }

    this.setTranslate(translateX, translateY);
};

/**
 * Set clip path and scroll bar translate transform
 *
 * @method
 * @param {number}  [translateX=0]  Horizontal offset (in pixels)
 * @param {number}  [translateY=0]  Vertical offset (in pixels)
 */
ScrollBox.prototype.setTranslate = function setTranslate(translateX: any, translateY: any) {
    // store translateX and translateY (needed by mouse event handlers)
    const translateXMax = this.position.w - this._box.w;
    const translateYMax = this.position.h - this._box.h;

    translateX = Lib.constrain(translateX || 0, 0, translateXMax);
    translateY = Lib.constrain(translateY || 0, 0, translateYMax);

    this.translateX = translateX;
    this.translateY = translateY;

    this.container.call(setTranslate,
        this._box.l - this.position.l - translateX,
        this._box.t - this.position.t - translateY);

    if(this._clipRect) {
        this._clipRect.attr({
            x: Math.floor(this.position.l + translateX - 0.5),
            y: Math.floor(this.position.t + translateY - 0.5)
        });
    }

    if(this.hbar) {
        const xf = translateX / translateXMax;

        this.hbar.call(setTranslate,
            translateX + xf * this._hbarTranslateMax,
            translateY);
    }

    if(this.vbar) {
        const yf = translateY / translateYMax;

        this.vbar.call(setTranslate,
            translateX,
            translateY + yf * this._vbarTranslateMax);
    }
};
