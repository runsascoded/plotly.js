import type { GraphDiv, FullAxis } from '../../../types/core';
import { selectAll } from 'd3-selection';
import Registry from '../../registry.js';
import Plots from '../../plots/plots.js';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import Color from '../color/index.js';
import { bBox, getTranslate, setClipUrl, setRect, setTranslate } from '../drawing/index.js';
import Fx from '../fx/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import setCursor from '../../lib/setcursor.js';
import dragElement from '../dragelement/index.js';
import { arrayEditor } from '../../plot_api/plot_template.js';
import drawArrowHead from './draw_arrow_head.js';
const strTranslate = Lib.strTranslate;

export default {
    draw: draw,
    drawOne: drawOne,
    drawRaw: drawRaw
};

/*
 * draw: draw all annotations without any new modifications
 */
function draw(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;

    fullLayout._infolayer.selectAll('.annotation').remove();

    for(let i = 0; i < fullLayout.annotations!.length; i++) {
        if(fullLayout.annotations![i].visible) {
            drawOne(gd, i);
        }
    }

    return Plots.previousPromises(gd);
}

/*
 * drawOne: draw a single cartesian or paper-ref annotation, potentially with modifications
 *
 * index (int): the annotation to draw
 */
function drawOne(gd: GraphDiv, index: any) {
    const fullLayout = gd._fullLayout;
    const options = fullLayout.annotations![index] || {};
    const xa = Axes.getFromId(gd, options.xref);
    const ya = Axes.getFromId(gd, options.yref);

    if(xa) xa.setScale();
    if(ya) ya.setScale();

    drawRaw(gd, options, index, false, xa, ya);
}

// Convert pixels to the coordinates relevant for the axis referred to. For
// example, for paper it would convert to a value normalized by the dimension of
// the plot.
// axDomainRef: if true and axa defined, draws relative to axis domain,
// otherwise draws relative to data (if axa defined) or paper (if not).
function shiftPosition(axa: FullAxis, dAx: any, axLetter: any, gs: any, options: any) {
    const optAx = options[axLetter];
    const axRef = options[axLetter + 'ref'];
    const vertical = axLetter.indexOf('y') !== -1;
    const axDomainRef = Axes.getRefType(axRef) === 'domain';
    const gsDim = vertical ? gs.h : gs.w;
    if(axa) {
        if(axDomainRef) {
            // here optAx normalized to length of axis (e.g., normally in range
            // 0 to 1). But dAx is in pixels. So we normalize dAx to length of
            // axis before doing the math.
            return optAx + (vertical ? -dAx : dAx) / axa._length;
        } else {
            return axa.p2r(axa.r2p(optAx) + dAx);
        }
    } else {
        return optAx + (vertical ? -dAx : dAx) / gsDim;
    }
}

/**
 * drawRaw: draw a single annotation, potentially with modifications
 *
 * @param {DOM element} gd
 * @param {object} options : this annotation's fullLayout options
 * @param {integer} index : index in 'annotations' container of the annotation to draw
 * @param {string} subplotId : id of the annotation's subplot
 *  - use false for 2d (i.e. cartesian or paper-ref) annotations
 * @param {object | undefined} xa : full x-axis object to compute subplot pos-to-px
 * @param {object | undefined} ya : ... y-axis
 */
function drawRaw(gd: GraphDiv, options: any, index: any, subplotId: any, xa: FullAxis, ya: FullAxis) {
    const fullLayout = gd._fullLayout;
    const gs = gd._fullLayout._size;
    const edits = gd._context.edits;

    let className, containerStr;

    if(subplotId) {
        className = 'annotation-' + subplotId;
        containerStr = subplotId + '.annotations';
    } else {
        className = 'annotation';
        containerStr = 'annotations';
    }

    const editHelpers = arrayEditor(gd.layout, containerStr, options);
    const modifyBase = editHelpers.modifyBase;
    const modifyItem = editHelpers.modifyItem;
    const getUpdateObj = editHelpers.getUpdateObj;

    // remove the existing annotation if there is one
    fullLayout._infolayer
        .selectAll('.' + className + '[data-index="' + index + '"]')
        .remove();

    const annClipID = 'clip' + fullLayout._uid + '_ann' + index;

    // this annotation is gone - quit now after deleting it
    // TODO: use d3 idioms instead of deleting and redrawing every time
    if(!options._input || options.visible === false) {
        selectAll('#' + annClipID).remove();
        return;
    }

    // calculated pixel positions
    // x & y each will get text, head, and tail as appropriate
    const annPosPx: any = {x: {}, y: {}};
    const textangle = +options.textangle || 0;

    // create the components
    // made a single group to contain all, so opacity can work right
    // with border/arrow together this could handle a whole bunch of
    // cleanup at this point, but works for now
    const annGroup = fullLayout._infolayer.append('g')
        .classed(className, true)
        .attr('data-index', String(index))
        .style('opacity', options.opacity);

    // another group for text+background so that they can rotate together
    const annTextGroup = annGroup.append('g')
        .classed('annotation-text-g', true);

    const editTextPosition = edits[options.showarrow ? 'annotationTail' : 'annotationPosition'];
    const textEvents = options.captureevents || edits.annotationText || editTextPosition;

    function makeEventData(initialEvent: any) {
        const eventData: any = {
            index: index,
            annotation: options._input,
            fullAnnotation: options,
            event: initialEvent
        };
        if(subplotId) {
            eventData.subplotId = subplotId;
        }
        return eventData;
    }

    const annTextGroupInner = annTextGroup.append('g')
        .style('pointer-events', textEvents ? 'all' : null)
        .call(setCursor, 'pointer')
        .on('click', function(event: any) {
            gd._dragging = false;
            gd.emit('plotly_clickannotation', makeEventData(event));
        });

    if(options.hovertext) {
        annTextGroupInner
        .on('mouseover', function(this: any) {
            const hoverOptions = options.hoverlabel;
            const hoverFont = hoverOptions.font;
            const bBox = this.getBoundingClientRect();
            const bBoxRef = gd.getBoundingClientRect();

            Fx.loneHover({
                x0: bBox.left - bBoxRef.left,
                x1: bBox.right - bBoxRef.left,
                y: (bBox.top + bBox.bottom) / 2 - bBoxRef.top,
                text: options.hovertext,
                color: hoverOptions.bgcolor,
                borderColor: hoverOptions.bordercolor,
                fontFamily: hoverFont.family,
                fontSize: hoverFont.size,
                fontColor: hoverFont.color,
                fontWeight: hoverFont.weight,
                fontStyle: hoverFont.style,
                fontVariant: hoverFont.variant,
                fontShadow: hoverFont.fontShadow,
                fontLineposition: hoverFont.fontLineposition,
                fontTextcase: hoverFont.fontTextcase,
            }, {
                container: fullLayout._hoverlayer.node(),
                outerContainer: fullLayout._paper.node(),
                gd: gd
            });
        })
        .on('mouseout', function() {
            Fx.loneUnhover(fullLayout._hoverlayer.node());
        });
    }

    const borderwidth = options.borderwidth;
    const borderpad = options.borderpad;
    const borderfull = borderwidth + borderpad;

    const annTextBG = annTextGroupInner.append('rect')
        .attr('class', 'bg')
        .style('stroke-width', borderwidth + 'px')
        .call(Color.stroke, options.bordercolor)
        .call(Color.fill, options.bgcolor);

    const isSizeConstrained = options.width || options.height;

    const annTextClipJoin = fullLayout._topclips
        .selectAll('#' + annClipID)
        .data(isSizeConstrained ? [0] : []);

    const annTextClipEnter = annTextClipJoin.enter().append('clipPath')
        .classed('annclip', true)
        .attr('id', annClipID);
    annTextClipEnter.append('rect');
    annTextClipJoin.exit().remove();
    const annTextClip = annTextClipJoin.merge(annTextClipEnter);

    const font = options.font;

    const text = fullLayout._meta ?
        Lib.templateString(options.text, fullLayout._meta) :
        options.text;

    const annText = annTextGroupInner.append('text')
        .classed('annotation-text', true)
        .text(text);

    function textLayout(s: any) {
        s.call(font, font)
        .attr('text-anchor', ({
                left: 'start',
                right: 'end'
            } as any)[options.align] || 'middle');

        svgTextUtils.convertToTspans(s, gd, drawGraphicalElements);
        return s;
    }

    function drawGraphicalElements() {
        // if the text has *only* a link, make the whole box into a link
        const anchor3 = annText.selectAll('a');
        if(anchor3.size() === 1 && anchor3.text() === annText.text()) {
            const wholeLink = annTextGroupInner.insert('a', ':first-child')
                .attr('xlink:xlink:href', anchor3.attr('xlink:href'))
                .attr('xlink:xlink:show', anchor3.attr('xlink:show'))
            .style('cursor', 'pointer');

            wholeLink.node().appendChild(annTextBG.node());
        }

        const mathjaxGroup = annTextGroupInner.select('.annotation-text-math-group');
        const hasMathjax = !mathjaxGroup.empty();
        const anntextBB = bBox(
                (hasMathjax ? mathjaxGroup : annText).node());
        const textWidth = anntextBB.width;
        const textHeight = anntextBB.height;
        const annWidth = options.width || textWidth;
        const annHeight = options.height || textHeight;
        const outerWidth = Math.round(annWidth + 2 * borderfull);
        const outerHeight = Math.round(annHeight + 2 * borderfull);

        function shiftFraction(v: any, anchor: any) {
            if(anchor === 'auto') {
                if(v < 1 / 3) anchor = 'left';
                else if(v > 2 / 3) anchor = 'right';
                else anchor = 'center';
            }
            return ({
                center: 0,
                middle: 0,
                left: 0.5,
                bottom: -0.5,
                right: -0.5,
                top: 0.5
            } as any)[anchor];
        }

        let annotationIsOffscreen = false;
        const letters = ['x', 'y'];

        for(let i = 0; i < letters.length; i++) {
            const axLetter = letters[i];
            const axRef = options[axLetter + 'ref'] || axLetter;
            const tailRef = options['a' + axLetter + 'ref'];
            const ax = {x: xa, y: ya}[axLetter];
            const dimAngle = (textangle + (axLetter === 'x' ? 0 : -90)) * Math.PI / 180;
            // note that these two can be either positive or negative
            const annSizeFromWidth = outerWidth * Math.cos(dimAngle);
            const annSizeFromHeight = outerHeight * Math.sin(dimAngle);
            // but this one is the positive total size
            const annSize = Math.abs(annSizeFromWidth) + Math.abs(annSizeFromHeight);
            const anchor = options[axLetter + 'anchor'];
            const overallShift = options[axLetter + 'shift'] * (axLetter === 'x' ? 1 : -1);
            const posPx = annPosPx[axLetter];
            let basePx;
            let textPadShift;
            let alignPosition;
            let autoAlignFraction;
            let textShift;
            const axRefType = Axes.getRefType(axRef);

            /*
             * calculate the *primary* pixel position
             * which is the arrowhead if there is one,
             * otherwise the text anchor point
             */
            if(ax && (axRefType !== 'domain')) {
                // check if annotation is off screen, to bypass DOM manipulations
                let posFraction = ax.r2fraction(options[axLetter]);
                if(posFraction < 0 || posFraction > 1) {
                    if(tailRef === axRef) {
                        posFraction = ax.r2fraction(options['a' + axLetter]);
                        if(posFraction < 0 || posFraction > 1) {
                            annotationIsOffscreen = true;
                        }
                    } else {
                        annotationIsOffscreen = true;
                    }
                }
                basePx = ax._offset + ax.r2p(options[axLetter]);
                autoAlignFraction = 0.5;
            } else {
                const axRefTypeEqDomain = axRefType === 'domain';
                if(axLetter === 'x') {
                    alignPosition = options[axLetter];
                    basePx = axRefTypeEqDomain ?
                        ax!._offset + ax!._length * alignPosition :
                        basePx = gs.l + gs.w * alignPosition;
                } else {
                    alignPosition = 1 - options[axLetter];
                    basePx = axRefTypeEqDomain ?
                        ax!._offset + ax!._length * alignPosition :
                        basePx = gs.t + gs.h * alignPosition;
                }
                autoAlignFraction = options.showarrow ? 0.5 : alignPosition;
            }

            // now translate this into pixel positions of head, tail, and text
            // as well as paddings for autorange
            if(options.showarrow) {
                posPx.head = basePx;

                let arrowLength = options['a' + axLetter];

                // with an arrow, the text rotates around the anchor point
                textShift = annSizeFromWidth * shiftFraction(0.5, options.xanchor) -
                    annSizeFromHeight * shiftFraction(0.5, options.yanchor);

                if(tailRef === axRef) {
                    // In the case tailRefType is 'domain' or 'paper', the arrow's
                    // position is set absolutely, which is consistent with how
                    // it behaves when its position is set in data ('range')
                    // coordinates.
                    const tailRefType = Axes.getRefType(tailRef);
                    if(tailRefType === 'domain') {
                        if(axLetter === 'y') {
                            arrowLength = 1 - arrowLength;
                        }
                        posPx.tail = ax!._offset + ax!._length * arrowLength;
                    } else if(tailRefType === 'paper') {
                        if(axLetter === 'y') {
                            arrowLength = 1 - arrowLength;
                            posPx.tail = gs.t + gs.h * arrowLength;
                        } else {
                            posPx.tail = gs.l + gs.w * arrowLength;
                        }
                    } else {
                        // assumed tailRef is range or paper referenced
                        posPx.tail = ax!._offset + ax!.r2p(arrowLength);
                    }
                    // tail is range- or domain-referenced: autorange pads the
                    // text in px from the tail
                    textPadShift = textShift;
                } else {
                    posPx.tail = basePx + arrowLength;
                    // tail is specified in px from head, so autorange also pads vs head
                    textPadShift = textShift + arrowLength;
                }

                posPx.text = posPx.tail + textShift;

                // constrain pixel/paper referenced so the draggers are at least
                // partially visible
                const maxPx = fullLayout[(axLetter === 'x') ? 'width' : 'height'];
                if(axRef === 'paper') {
                    posPx.head = Lib.constrain(posPx.head, 1, maxPx! - 1);
                }
                if(tailRef === 'pixel') {
                    const shiftPlus = -Math.max(posPx.tail - 3, posPx.text);
                    const shiftMinus = Math.min(posPx.tail + 3, posPx.text) - maxPx!;
                    if(shiftPlus > 0) {
                        posPx.tail += shiftPlus;
                        posPx.text += shiftPlus;
                    } else if(shiftMinus > 0) {
                        posPx.tail -= shiftMinus;
                        posPx.text -= shiftMinus;
                    }
                }

                posPx.tail += overallShift;
                posPx.head += overallShift;
            } else {
                // with no arrow, the text rotates and *then* we put the anchor
                // relative to the new bounding box
                textShift = annSize * shiftFraction(autoAlignFraction, anchor);
                textPadShift = textShift;
                posPx.text = basePx + textShift;
            }

            posPx.text += overallShift;
            textShift += overallShift;
            textPadShift += overallShift;

            // padplus/minus are used by autorange
            options['_' + axLetter + 'padplus'] = (annSize / 2) + textPadShift;
            options['_' + axLetter + 'padminus'] = (annSize / 2) - textPadShift;

            // size/shift are used during dragging
            options['_' + axLetter + 'size'] = annSize;
            options['_' + axLetter + 'shift'] = textShift;
        }

        if(annotationIsOffscreen) {
            annTextGroupInner.remove();
            return;
        }

        let xShift = 0;
        let yShift = 0;

        if(options.align !== 'left') {
            xShift = (annWidth - textWidth) * (options.align === 'center' ? 0.5 : 1);
        }
        if(options.valign !== 'top') {
            yShift = (annHeight - textHeight) * (options.valign === 'middle' ? 0.5 : 1);
        }

        if(hasMathjax) {
            mathjaxGroup.select('svg')
                .attr('x', borderfull + xShift - 1)
                .attr('y', borderfull + yShift)
            .call(setClipUrl, isSizeConstrained ? annClipID : null, gd);
        } else {
            const texty = borderfull + yShift - anntextBB.top;
            const textx = borderfull + xShift - anntextBB.left;

            annText.call(svgTextUtils.positionText, textx, texty)
                .call(setClipUrl, isSizeConstrained ? annClipID : null, gd);
        }

        annTextClip.select('rect').call(setRect, borderfull, borderfull,
            annWidth, annHeight);

        annTextBG.call(setRect, borderwidth / 2, borderwidth / 2,
            outerWidth - borderwidth, outerHeight - borderwidth);

        annTextGroupInner.call(setTranslate,
            Math.round(annPosPx.x.text - outerWidth / 2),
            Math.round(annPosPx.y.text - outerHeight / 2));

        /*
         * rotate text and background
         * we already calculated the text center position *as rotated*
         * because we needed that for autoranging anyway, so now whether
         * we have an arrow or not, we rotate about the text center.
         */
        annTextGroup.attr('transform', 'rotate(' + textangle + ',' +
                            annPosPx.x.text + ',' + annPosPx.y.text + ')');

        /*
         * add the arrow
         * uses options[arrowwidth,arrowcolor,arrowhead] for styling
         * dx and dy are normally zero, but when you are dragging the textbox
         * while the head stays put, dx and dy are the pixel offsets
         */
        const drawArrow = function(dx: any, dy: any) {
            annGroup
                .selectAll('.annotation-arrow-g')
                .remove();

            const headX = annPosPx.x.head;
            const headY = annPosPx.y.head;
            let tailX = annPosPx.x.tail + dx;
            let tailY = annPosPx.y.tail + dy;
            const textX = annPosPx.x.text + dx;
            const textY = annPosPx.y.text + dy;

            // find the edge of the text box, where we'll start the arrow:
            // create transform matrix to rotate the text box corners
            const transform = Lib.rotationXYMatrix(textangle, textX, textY);
            const applyTransform = Lib.apply2DTransform(transform);
            const applyTransform2 = Lib.apply2DTransform2(transform);

            // calculate and transform bounding box
            const width = +annTextBG.attr('width');
            const height = +annTextBG.attr('height');
            const xLeft = textX - 0.5 * width;
            const xRight = xLeft + width;
            const yTop = textY - 0.5 * height;
            const yBottom = yTop + height;
            const edges = [
                [xLeft, yTop, xLeft, yBottom],
                [xLeft, yBottom, xRight, yBottom],
                [xRight, yBottom, xRight, yTop],
                [xRight, yTop, xLeft, yTop]
            ].map(applyTransform2);

            // Remove the line if it ends inside the box.  Use ray
            // casting for rotated boxes: see which edges intersect a
            // line from the arrowhead to far away and reduce with xor
            // to get the parity of the number of intersections.
            if(edges.reduce(function(a: any, x: any) {
                return (a as any) ^
                    (!!Lib.segmentsIntersect(headX, headY, headX + 1e6, headY + 1e6,
                            x[0], x[1], x[2], x[3]) as any);
            }, false)) {
                // no line or arrow - so quit drawArrow now
                return;
            }

            edges.forEach(function(x: any) {
                const p = Lib.segmentsIntersect(tailX, tailY, headX, headY,
                            x[0], x[1], x[2], x[3]);
                if(p) {
                    tailX = p.x;
                    tailY = p.y;
                }
            });

            const strokewidth = options.arrowwidth;
            const arrowColor = options.arrowcolor;
            const arrowSide = options.arrowside;

            const arrowGroup = annGroup.append('g')
                .style('opacity', Color.opacity(arrowColor))
                .classed('annotation-arrow-g', true);

            const arrow = arrowGroup.append('path')
                .attr('d', 'M' + tailX + ',' + tailY + 'L' + headX + ',' + headY)
                .style('stroke-width', strokewidth + 'px')
                .call(Color.stroke, Color.rgb(arrowColor));

            drawArrowHead(arrow, arrowSide, options);

            // the arrow dragger is a small square right at the head, then a line to the tail,
            // all expanded by a stroke width of 6px plus the arrow line width
            if(edits.annotationPosition && arrow.node().parentNode && !subplotId) {
                let arrowDragHeadX = headX;
                let arrowDragHeadY = headY;
                if(options.standoff) {
                    const arrowLength = Math.sqrt(Math.pow(headX - tailX, 2) + Math.pow(headY - tailY, 2));
                    arrowDragHeadX += options.standoff * (tailX - headX) / arrowLength;
                    arrowDragHeadY += options.standoff * (tailY - headY) / arrowLength;
                }
                const arrowDrag = arrowGroup.append('path')
                    .classed('annotation-arrow', true)
                    .classed('anndrag', true)
                    .classed('cursor-move', true)
                    .attr('d', 'M3,3H-3V-3H3ZM0,0L' + (tailX - arrowDragHeadX) + ',' + (tailY - arrowDragHeadY))
                    .attr('transform', strTranslate(arrowDragHeadX, arrowDragHeadY))
                    .style('stroke-width', (strokewidth + 6) + 'px')
                    .call(Color.stroke, 'rgba(0,0,0,0)')
                    .call(Color.fill, 'rgba(0,0,0,0)');

                let annx0: any, anny0: any;

                // dragger for the arrow & head: translates the whole thing
                // (head/tail/text) all together
                dragElement.init({
                    element: arrowDrag.node(),
                    gd: gd,
                    prepFn: function() {
                        const pos = getTranslate(annTextGroupInner);

                        annx0 = pos.x;
                        anny0 = pos.y;
                        if(xa && xa.autorange) {
                            modifyBase(xa._name + '.autorange', true);
                        }
                        if(ya && ya.autorange) {
                            modifyBase(ya._name + '.autorange', true);
                        }
                    },
                    moveFn: function(dx: any, dy: any) {
                        const annxy0 = applyTransform(annx0, anny0);
                        const xcenter = annxy0[0] + dx;
                        const ycenter = annxy0[1] + dy;
                        annTextGroupInner.call(setTranslate, xcenter, ycenter);

                        modifyItem('x',
                            shiftPosition(xa, dx, 'x', gs, options));
                        modifyItem('y',
                            shiftPosition(ya, dy, 'y', gs, options));

                        // for these 2 calls to shiftPosition, it is assumed xa, ya are
                        // defined, so gsDim will not be used, but we put it in
                        // anyways for consistency
                        if(options.axref === options.xref) {
                            modifyItem('ax', shiftPosition(xa, dx, 'ax', gs, options));
                        }

                        if(options.ayref === options.yref) {
                            modifyItem('ay', shiftPosition(ya, dy, 'ay', gs, options));
                        }

                        arrowGroup.attr('transform', strTranslate(dx, dy));
                        annTextGroup.attr('transform', 'rotate(' + textangle + ',' +
                                   xcenter + ',' + ycenter + ')');
                    },
                    doneFn: function() {
                        Registry.call('_guiRelayout', gd, getUpdateObj());
                        const notesBox = document.querySelector('.js-notes-box-panel');
                        if(notesBox) (notesBox as any).redraw((notesBox as any).selectedObj);
                    }
                });
            }
        };

        if(options.showarrow) drawArrow(0, 0);

        // user dragging the annotation (text, not arrow)
        if(editTextPosition) {
            let baseTextTransform: any;

            // dragger for the textbox: if there's an arrow, just drag the
            // textbox and tail, leave the head untouched
            dragElement.init({
                element: annTextGroupInner.node(),
                gd: gd,
                prepFn: function() {
                    baseTextTransform = annTextGroup.attr('transform');
                },
                moveFn: function(dx: any, dy: any) {
                    let csr = 'pointer';
                    if(options.showarrow) {
                        // for these 2 calls to shiftPosition, it is assumed xa, ya are
                        // defined, so gsDim will not be used, but we put it in
                        // anyways for consistency
                        if(options.axref === options.xref) {
                            modifyItem('ax', shiftPosition(xa, dx, 'ax', gs, options));
                        } else {
                            modifyItem('ax', options.ax + dx);
                        }

                        if(options.ayref === options.yref) {
                            modifyItem('ay', shiftPosition(ya, dy, 'ay', gs.w, options));
                        } else {
                            modifyItem('ay', options.ay + dy);
                        }

                        drawArrow(dx, dy);
                    } else if(!subplotId) {
                        let xUpdate, yUpdate;
                        if(xa) {
                            // shiftPosition will not execute code where xa was
                            // undefined, so we use to calculate xUpdate too
                            xUpdate = shiftPosition(xa, dx, 'x', gs, options);
                        } else {
                            const widthFraction = options._xsize / gs.w;
                            const xLeft = options.x + (options._xshift - options.xshift) / gs.w - widthFraction / 2;

                            xUpdate = dragElement.align(xLeft + dx / gs.w,
                                widthFraction, 0, 1, options.xanchor);
                        }

                        if(ya) {
                            // shiftPosition will not execute code where ya was
                            // undefined, so we use to calculate yUpdate too
                            yUpdate = shiftPosition(ya, dy, 'y', gs, options);
                        } else {
                            const heightFraction = options._ysize / gs.h;
                            const yBottom = options.y - (options._yshift + options.yshift) / gs.h - heightFraction / 2;

                            yUpdate = dragElement.align(yBottom - dy / gs.h,
                                heightFraction, 0, 1, options.yanchor);
                        }
                        modifyItem('x', xUpdate);
                        modifyItem('y', yUpdate);
                        if(!xa || !ya) {
                            csr = dragElement.getCursor(
                                xa ? 0.5 : xUpdate,
                                ya ? 0.5 : yUpdate,
                                options.xanchor, options.yanchor
                            );
                        }
                    } else return;

                    annTextGroup.attr('transform', strTranslate(dx, dy) + baseTextTransform);

                    setCursor(annTextGroupInner, csr);
                },
                clickFn: function(_: any, initialEvent: any) {
                    if(options.captureevents) {
                        gd.emit('plotly_clickannotation', makeEventData(initialEvent));
                    }
                },
                doneFn: function() {
                    setCursor(annTextGroupInner);
                    Registry.call('_guiRelayout', gd, getUpdateObj());
                    const notesBox = document.querySelector('.js-notes-box-panel');
                    if(notesBox) (notesBox as any).redraw((notesBox as any).selectedObj);
                }
            });
        }
    }

    if(edits.annotationText) {
        annText.call(svgTextUtils.makeEditable, {delegate: annTextGroupInner, gd: gd})
            .call(textLayout)
            .on('edit', function(this: any, _text: any) {
                options.text = _text;

                this.call(textLayout);

                modifyItem('text', _text);

                if(xa && xa.autorange) {
                    modifyBase(xa._name + '.autorange', true);
                }
                if(ya && ya.autorange) {
                    modifyBase(ya._name + '.autorange', true);
                }

                Registry.call('_guiRelayout', gd, getUpdateObj());
            });
    } else annText.call(textLayout);
}
