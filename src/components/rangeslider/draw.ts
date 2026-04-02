import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { _guiRelayout } from '../../plot_api/plot_api.js';
import Plots from '../../plots/plots.js';
import Lib from '../../lib/index.js';
import { crispRound, setClipUrl } from '../drawing/index.js';
import Color from '../color/index.js';
import Titles from '../titles/index.js';
import Cartesian from '../../plots/cartesian/index.js';
import axisIDs from '../../plots/cartesian/axis_ids.js';
import dragElement from '../dragelement/index.js';
import setCursor from '../../lib/setcursor.js';
import constants from './constants.js';
const strTranslate = Lib.strTranslate;

export default function(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const rangeSliderData = fullLayout._rangeSliderData;
    for(let i = 0; i < rangeSliderData.length; i++) {
        const opts = rangeSliderData[i][constants.name];
        // fullLayout._uid may not exist when we call makeData
        opts._clipId = opts._id + '-' + fullLayout._uid;
    }

    /*
     * <g container />
     *  <rect bg />
     *  < .... range plot />
     *  <rect mask-min />
     *  <rect mask-max />
     *  <rect slidebox />
     *  <g grabber-min />
     *      <rect handle-min />
     *      <rect grabare-min />
     *  <g grabber-max />
     *      <rect handle-max />
     *      <rect grabare-max />
     *
     *  ...
     */

    function keyFunction(axisOpts: any) {
        return axisOpts._name;
    }

    const rangeSliders = fullLayout._infolayer
        .selectAll('g.' + constants.containerClassName)
        .data(rangeSliderData, keyFunction);

    // remove exiting sliders and their corresponding clip paths
    rangeSliders.exit().each(function(axisOpts: any) {
        const opts = axisOpts[constants.name];
        fullLayout._topdefs.select('#' + opts._clipId).remove();
    }).remove();

    // return early if no range slider is visible
    if(rangeSliderData.length === 0) return;

    const rangeSliderEnter = rangeSliders.enter().append('g')
        .classed(constants.containerClassName, true)
        .attr('pointer-events', 'all');

    // for all present range sliders
    rangeSliders.merge(rangeSliderEnter).each(function(this: any, axisOpts: any) {
        const rangeSlider = select(this);
        const opts = axisOpts[constants.name];
        const oppAxisOpts = fullLayout[axisIDs.id2name(axisOpts.anchor)];
        const oppAxisRangeOpts = opts[axisIDs.id2name(axisOpts.anchor)];

        // update range
        // Expand slider range to the axis range
        if(opts.range) {
            const rng = Lib.simpleMap(opts.range, axisOpts.r2l);
            const axRng = Lib.simpleMap(axisOpts.range, axisOpts.r2l);
            let newRng;

            if(axRng[0] < axRng[1]) {
                newRng = [
                    Math.min(rng[0], axRng[0]),
                    Math.max(rng[1], axRng[1])
                ];
            } else {
                newRng = [
                    Math.max(rng[0], axRng[0]),
                    Math.min(rng[1], axRng[1])
                ];
            }

            opts.range = opts._input.range = Lib.simpleMap(newRng, axisOpts.l2r);
        }

        axisOpts.cleanRange('rangeslider.range');

        // update range slider dimensions

        const gs = fullLayout._size;
        const domain = axisOpts.domain;

        opts._width = gs.w * (domain[1] - domain[0]);

        const x = Math.round(gs.l + (gs.w * domain[0]));

        const y = Math.round(
            gs.t + gs.h * (1 - axisOpts._counterDomainMin) +
            (axisOpts.side === 'bottom' ? axisOpts._depth : 0) +
            opts._offsetShift + constants.extraPad
        );

        rangeSlider.attr('transform', strTranslate(x, y));

        // update data <--> pixel coordinate conversion methods

        opts._rl = Lib.simpleMap(opts.range, axisOpts.r2l);
        const rl0 = opts._rl[0];
        const rl1 = opts._rl[1];
        const drl = rl1 - rl0;

        opts.p2d = function(v: any) {
            return (v / opts._width) * drl + rl0;
        };

        opts.d2p = function(v: any) {
            return (v - rl0) / drl * opts._width;
        };

        if(axisOpts.rangebreaks) {
            const rsBreaks = axisOpts.locateBreaks(rl0, rl1);

            if(rsBreaks.length) {
                let j, brk;

                let lBreaks = 0;
                for(j = 0; j < rsBreaks.length; j++) {
                    brk = rsBreaks[j];
                    lBreaks += (brk.max - brk.min);
                }

                // TODO fix for reversed-range axes !!!

                // compute slope and piecewise offsets
                const m2 = opts._width / (rl1 - rl0 - lBreaks);
                const _B = [-m2 * rl0];
                for(j = 0; j < rsBreaks.length; j++) {
                    brk = rsBreaks[j];
                    _B.push(_B[_B.length - 1] - m2 * (brk.max - brk.min));
                }

                opts.d2p = function(v: any) {
                    let b = _B[0];
                    for(let j = 0; j < rsBreaks.length; j++) {
                        const brk = rsBreaks[j];
                        if(v >= brk.max) b = _B[j + 1];
                        else if(v < brk.min) break;
                    }
                    return b + m2 * v;
                };

                // fill pixel (i.e. 'p') min/max here,
                // to not have to loop through the _rangebreaks twice during `p2d`
                for(j = 0; j < rsBreaks.length; j++) {
                    brk = rsBreaks[j];
                    brk.pmin = opts.d2p(brk.min);
                    brk.pmax = opts.d2p(brk.max);
                }

                opts.p2d = function(v: any) {
                    let b = _B[0];
                    for(let j = 0; j < rsBreaks.length; j++) {
                        const brk = rsBreaks[j];
                        if(v >= brk.pmax) b = _B[j + 1];
                        else if(v < brk.pmin) break;
                    }
                    return (v - b) / m2;
                };
            }
        }

        if(oppAxisRangeOpts.rangemode !== 'match') {
            const range0OppAxis = oppAxisOpts.r2l(oppAxisRangeOpts.range[0]);
            const range1OppAxis = oppAxisOpts.r2l(oppAxisRangeOpts.range[1]);
            const distOppAxis = range1OppAxis - range0OppAxis;

            opts.d2pOppAxis = function(v: any) {
                return (v - range0OppAxis) / distOppAxis * opts._height;
            };
        }

        // update inner nodes

        rangeSlider
            .call(drawBg, gd, axisOpts, opts)
            .call(addClipPath, gd, axisOpts, opts)
            .call(drawRangePlot, gd, axisOpts, opts)
            .call(drawMasks, gd, axisOpts, opts, oppAxisRangeOpts)
            .call(drawSlideBox, gd, axisOpts, opts)
            .call(drawGrabbers, gd, axisOpts, opts);

        // setup drag element
        setupDragElement(rangeSlider, gd, axisOpts, opts);

        // update current range
        setPixelRange(rangeSlider, gd, axisOpts, opts, oppAxisOpts, oppAxisRangeOpts);

        // title goes next to range slider instead of tick labels, so
        // just take it over and draw it from here
        if(axisOpts.side === 'bottom') {
            Titles.draw(gd, axisOpts._id + 'title', {
                propContainer: axisOpts,
                propName: axisOpts._name + '.title.text',
                placeholder: fullLayout._dfltTitle.x,
                attributes: {
                    x: axisOpts._offset + axisOpts._length / 2,
                    y: y + opts._height + opts._offsetShift + 10 + 1.5 * axisOpts.title.font.size,
                    'text-anchor': 'middle'
                }
            });
        }
    });
}

function eventX(event: any) {
    if(typeof event.clientX === 'number') {
        return event.clientX;
    }
    if(event.touches && event.touches.length > 0) {
        return event.touches[0].clientX;
    }
    return 0;
}

function setupDragElement(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    if(gd._context.staticPlot) return;

    const slideBox = rangeSlider.select('rect.' + constants.slideBoxClassName).node();
    const grabAreaMin = rangeSlider.select('rect.' + constants.grabAreaMinClassName).node();
    const grabAreaMax = rangeSlider.select('rect.' + constants.grabAreaMaxClassName).node();

    function mouseDownHandler(this: any, event: any) {
        const target = event.target;
        const startX = eventX(event);
        const offsetX = startX - rangeSlider.node().getBoundingClientRect().left;
        const minVal = opts.d2p(axisOpts._rl[0]);
        const maxVal = opts.d2p(axisOpts._rl[1]);

        const dragCover = dragElement.coverSlip();

        this.addEventListener('touchmove', mouseMove);
        this.addEventListener('touchend', mouseUp);
        dragCover.addEventListener('mousemove', mouseMove);
        dragCover.addEventListener('mouseup', mouseUp);

        function mouseMove(e: any) {
            const clientX = eventX(e);
            const delta = +clientX - startX;
            let pixelMin, pixelMax, cursor;

            switch(target) {
                case slideBox:
                    cursor = 'ew-resize';
                    if(minVal + delta > axisOpts._length || maxVal + delta < 0) {
                        return;
                    }
                    pixelMin = minVal + delta;
                    pixelMax = maxVal + delta;
                    break;

                case grabAreaMin:
                    cursor = 'col-resize';
                    if(minVal + delta > axisOpts._length) {
                        return;
                    }
                    pixelMin = minVal + delta;
                    pixelMax = maxVal;
                    break;

                case grabAreaMax:
                    cursor = 'col-resize';
                    if(maxVal + delta < 0) {
                        return;
                    }
                    pixelMin = minVal;
                    pixelMax = maxVal + delta;
                    break;

                default:
                    cursor = 'ew-resize';
                    pixelMin = offsetX;
                    pixelMax = offsetX + delta;
                    break;
            }

            if(pixelMax < pixelMin) {
                const tmp = pixelMax;
                pixelMax = pixelMin;
                pixelMin = tmp;
            }

            opts._pixelMin = pixelMin;
            opts._pixelMax = pixelMax;

            setCursor(select(dragCover), cursor);
            setDataRange(rangeSlider, gd, axisOpts, opts);
        }

        function mouseUp(this: any) {
            dragCover.removeEventListener('mousemove', mouseMove);
            dragCover.removeEventListener('mouseup', mouseUp);
            this.removeEventListener('touchmove', mouseMove);
            this.removeEventListener('touchend', mouseUp);
            Lib.removeElement(dragCover);
        }
    }

    rangeSlider.on('mousedown', mouseDownHandler);
    rangeSlider.on('touchstart', mouseDownHandler);
}

function setDataRange(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    function clamp(v: any) {
        return axisOpts.l2r(Lib.constrain(v, opts._rl[0], opts._rl[1]));
    }

    const dataMin = clamp(opts.p2d(opts._pixelMin));
    const dataMax = clamp(opts.p2d(opts._pixelMax));

    window.requestAnimationFrame(function() {
        _guiRelayout(gd, axisOpts._name + '.range', [dataMin, dataMax]);
    });
}

function setPixelRange(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any, oppAxisOpts: any, oppAxisRangeOpts: any) {
    const hw2 = constants.handleWidth / 2;

    function clamp(v: any) {
        return Lib.constrain(v, 0, opts._width);
    }

    function clampOppAxis(v: any) {
        return Lib.constrain(v, 0, opts._height);
    }

    function clampHandle(v: any) {
        return Lib.constrain(v, -hw2, opts._width + hw2);
    }

    const pixelMin = clamp(opts.d2p(axisOpts._rl[0]));
    const pixelMax = clamp(opts.d2p(axisOpts._rl[1]));

    rangeSlider.select('rect.' + constants.slideBoxClassName)
        .attr('x', pixelMin)
        .attr('width', pixelMax - pixelMin);

    rangeSlider.select('rect.' + constants.maskMinClassName)
        .attr('width', pixelMin);

    rangeSlider.select('rect.' + constants.maskMaxClassName)
        .attr('x', pixelMax)
        .attr('width', opts._width - pixelMax);

    if(oppAxisRangeOpts.rangemode !== 'match') {
        const pixelMinOppAxis = opts._height - clampOppAxis(opts.d2pOppAxis(oppAxisOpts._rl[1]));
        const pixelMaxOppAxis = opts._height - clampOppAxis(opts.d2pOppAxis(oppAxisOpts._rl[0]));

        rangeSlider.select('rect.' + constants.maskMinOppAxisClassName)
            .attr('x', pixelMin)
            .attr('height', pixelMinOppAxis)
            .attr('width', pixelMax - pixelMin);

        rangeSlider.select('rect.' + constants.maskMaxOppAxisClassName)
            .attr('x', pixelMin)
            .attr('y', pixelMaxOppAxis)
            .attr('height', opts._height - pixelMaxOppAxis)
            .attr('width', pixelMax - pixelMin);

        rangeSlider.select('rect.' + constants.slideBoxClassName)
            .attr('y', pixelMinOppAxis)
            .attr('height', pixelMaxOppAxis - pixelMinOppAxis);
    }

    // add offset for crispier corners
    // https://github.com/plotly/plotly.js/pull/1409
    const offset = 0.5;

    const xMin = Math.round(clampHandle(pixelMin - hw2)) - offset;
    const xMax = Math.round(clampHandle(pixelMax - hw2)) + offset;

    rangeSlider.select('g.' + constants.grabberMinClassName)
        .attr('transform', strTranslate(xMin, offset));

    rangeSlider.select('g.' + constants.grabberMaxClassName)
        .attr('transform', strTranslate(xMax, offset));
}

function drawBg(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    const bg = Lib.ensureSingle(rangeSlider, 'rect', constants.bgClassName, function(s: any) {
        s
            .attr('x', 0)
            .attr('y', 0)
            .attr('shape-rendering', 'crispEdges');
    });

    const borderCorrect = (opts.borderwidth % 2) === 0 ?
        opts.borderwidth :
        opts.borderwidth - 1;

    const offsetShift = -opts._offsetShift;
    const lw = crispRound(gd, opts.borderwidth);

    bg
        .attr('width', opts._width + borderCorrect)
        .attr('height', opts._height + borderCorrect)
        .attr('transform', strTranslate(offsetShift, offsetShift))
        .attr('stroke-width', lw)
    .call(Color.stroke, opts.bordercolor)
    .call(Color.fill, opts.bgcolor);
}

function addClipPath(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    const fullLayout = gd._fullLayout;

    const clipPath = Lib.ensureSingleById(fullLayout._topdefs, 'clipPath', opts._clipId, function(s: any) {
        s.append('rect')
            .attr('x', 0)
            .attr('y', 0);
    });

    clipPath.select('rect')
        .attr('width', opts._width)
        .attr('height', opts._height);
}

function drawRangePlot(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    const calcData = gd.calcdata;

    const rangePlots = rangeSlider.selectAll('g.' + constants.rangePlotClassName)
        .data(axisOpts._subplotsWith, Lib.identity);

    const rangePlotsEnter = rangePlots.enter().append('g')
        .attr('class', function(id: any) { return constants.rangePlotClassName + ' ' + id; })
        .call(setClipUrl, opts._clipId, gd);

    rangePlots.exit().remove();

    const rangePlotsMerged = rangePlots.merge(rangePlotsEnter);
    rangePlotsMerged.order();

    let mainplotinfo: any;

    rangePlotsMerged.each(function(this: any, id: any, i: any) {
        const plotgroup = select(this);
        const isMainPlot = (i === 0);

        const oppAxisOpts = axisIDs.getFromId(gd, id, 'y');
        const oppAxisName = oppAxisOpts._name;
        const oppAxisRangeOpts = opts[oppAxisName];

        const mockFigure: any = {
            data: [],
            layout: {
                xaxis: {
                    type: axisOpts.type,
                    domain: [0, 1],
                    range: opts.range.slice(),
                    calendar: axisOpts.calendar
                },
                width: opts._width,
                height: opts._height,
                margin: { t: 0, b: 0, l: 0, r: 0 }
            },
            _context: gd._context
        };

        if(axisOpts.rangebreaks) {
            mockFigure.layout.xaxis.rangebreaks = axisOpts.rangebreaks;
        }

        mockFigure.layout[oppAxisName] = {
            type: oppAxisOpts.type,
            domain: [0, 1],
            range: oppAxisRangeOpts.rangemode !== 'match' ? oppAxisRangeOpts.range.slice() : oppAxisOpts.range.slice(),
            calendar: oppAxisOpts.calendar
        };

        if(oppAxisOpts.rangebreaks) {
            mockFigure.layout[oppAxisName].rangebreaks = oppAxisOpts.rangebreaks;
        }

        Plots.supplyDefaults(mockFigure);

        const xa = mockFigure._fullLayout.xaxis;
        const ya = mockFigure._fullLayout[oppAxisName];

        xa.clearCalc();
        xa.setScale();
        ya.clearCalc();
        ya.setScale();

        const plotinfo: any = {
            id: id,
            plotgroup: plotgroup,
            xaxis: xa,
            yaxis: ya,
            isRangePlot: true
        };

        if(isMainPlot) mainplotinfo = plotinfo;
        else {
            plotinfo.mainplot = 'xy';
            plotinfo.mainplotinfo = mainplotinfo;
        }

        Cartesian.rangePlot(gd, plotinfo, filterRangePlotCalcData(calcData, id));
    });
}

function filterRangePlotCalcData(calcData: any, subplotId: any) {
    const out: any[] = [];

    for(let i = 0; i < calcData.length; i++) {
        const calcTrace = calcData[i];
        const trace = calcTrace[0].trace;

        if(trace.xaxis + trace.yaxis === subplotId) {
            out.push(calcTrace);
        }
    }

    return out;
}

function drawMasks(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any, oppAxisRangeOpts: any) {
    const maskMin = Lib.ensureSingle(rangeSlider, 'rect', constants.maskMinClassName, function(s: any) {
        s
            .attr('x', 0)
            .attr('y', 0)
            .attr('shape-rendering', 'crispEdges');
    });

    maskMin
        .attr('height', opts._height)
        .call(Color.fill, constants.maskColor);

    const maskMax = Lib.ensureSingle(rangeSlider, 'rect', constants.maskMaxClassName, function(s: any) {
        s
            .attr('y', 0)
            .attr('shape-rendering', 'crispEdges');
    });

    maskMax
        .attr('height', opts._height)
        .call(Color.fill, constants.maskColor);

    // masks used for oppAxis zoom
    if(oppAxisRangeOpts.rangemode !== 'match') {
        const maskMinOppAxis = Lib.ensureSingle(rangeSlider, 'rect', constants.maskMinOppAxisClassName, function(s: any) {
            s
                .attr('y', 0)
                .attr('shape-rendering', 'crispEdges');
        });

        maskMinOppAxis
            .attr('width', opts._width)
            .call(Color.fill, constants.maskOppAxisColor);

        const maskMaxOppAxis = Lib.ensureSingle(rangeSlider, 'rect', constants.maskMaxOppAxisClassName, function(s: any) {
            s
                .attr('y', 0)
                .attr('shape-rendering', 'crispEdges');
        });

        maskMaxOppAxis
            .attr('width', opts._width)
            .style('border-top', (constants as any).maskOppBorder)
            .call(Color.fill, constants.maskOppAxisColor);
    }
}

function drawSlideBox(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    if(gd._context.staticPlot) return;

    const slideBox = Lib.ensureSingle(rangeSlider, 'rect', constants.slideBoxClassName, function(s: any) {
        s
            .attr('y', 0)
            .attr('cursor', constants.slideBoxCursor)
            .attr('shape-rendering', 'crispEdges');
    });

    slideBox
        .attr('height', opts._height)
        .attr('fill', constants.slideBoxFill);
}

function drawGrabbers(rangeSlider: any, gd: GraphDiv, axisOpts: any, opts: any) {
    // <g grabber />
    const grabberMin = Lib.ensureSingle(rangeSlider, 'g', constants.grabberMinClassName);
    const grabberMax = Lib.ensureSingle(rangeSlider, 'g', constants.grabberMaxClassName);

    // <g handle />
    function setHandleFixAttrs(s: any) {
        s.attr('x', 0)
            .attr('width', constants.handleWidth)
            .attr('rx', constants.handleRadius)
            .attr('fill', Color.background)
            .attr('stroke', Color.defaultLine)
            .attr('stroke-width', constants.handleStrokeWidth)
            .attr('shape-rendering', 'crispEdges');
    }
    const handleDynamicY = Math.round(opts._height / 4);
    const handleDynamicHeight = Math.round(opts._height / 2);
    const handleMin = Lib.ensureSingle(grabberMin, 'rect', constants.handleMinClassName, setHandleFixAttrs);
    handleMin.attr('y', handleDynamicY).attr('height', handleDynamicHeight);

    const handleMax = Lib.ensureSingle(grabberMax, 'rect', constants.handleMaxClassName, setHandleFixAttrs);
    handleMax.attr('y', handleDynamicY).attr('height', handleDynamicHeight);

    // <g grabarea />
    function setGrabAreaFixAttrs(s: any) {
        s.attr('width', constants.grabAreaWidth)
            .attr('x', 0)
            .attr('y', 0)
            .attr('fill', constants.grabAreaFill);
        if(!gd._context.staticPlot) {
            s.attr('cursor', constants.grabAreaCursor);
        }
    }

    const grabAreaMin = Lib.ensureSingle(grabberMin, 'rect', constants.grabAreaMinClassName, setGrabAreaFixAttrs);
    grabAreaMin.attr('height', opts._height);

    const grabAreaMax = Lib.ensureSingle(grabberMax, 'rect', constants.grabAreaMaxClassName, setGrabAreaFixAttrs);
    grabAreaMax.attr('height', opts._height);
}
