import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import * as d3Hierarchy from 'd3-hierarchy';
import { interpolate } from 'd3-interpolate';
import { transition as d3Transition } from 'd3-transition';
import { font as drawingFont, bBox } from '../../components/drawing/index.js';
import Lib from '../../lib/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import uniformText from '../bar/uniform_text.js';
import piePlot from '../pie/plot.js';
import { getRotationAngle } from '../pie/helpers.js';
import _style from './style.js';
const { styleOne } = _style;
import _style2 from '../bar/style.js';
const { resizeText } = _style2;
import attachFxHandlers from './fx.js';
import constants from './constants.js';
import helpers from './helpers.js';
const recordMinTextSize = uniformText.recordMinTextSize;
const clearMinTextSize = uniformText.clearMinTextSize;
const computeTransform = piePlot.computeTransform;
const transformInsideText = piePlot.transformInsideText;

export function plot(gd: GraphDiv, cdmodule: any[], transitionOpts: any, makeOnCompleteCallback: any) {
    const fullLayout = gd._fullLayout;
    const layer = fullLayout._sunburstlayer;
    let join, onComplete: any;

    // If transition config is provided, then it is only a partial replot and traces not
    // updated are removed.
    const isFullReplot = !transitionOpts;
    const hasTransition = !fullLayout.uniformtext.mode && helpers.hasTransition(transitionOpts);

    clearMinTextSize('sunburst', fullLayout);

    join = layer.selectAll('g.trace.sunburst').data(cdmodule, function (cd: any) {
        return cd[0].trace.uid;
    });

    // d3 v7: capture exit before `.merge()` reassigns `join`
    const joinExit = join.exit();

    // using same 'stroke-linejoin' as pie traces
    const joinEnter = join.enter().append('g').classed('trace', true).classed('sunburst', true).attr('stroke-linejoin', 'round');

    join = join.merge(joinEnter);
    join.order();

    if (hasTransition) {
        if (makeOnCompleteCallback) {
            // If it was passed a callback to register completion, make a callback. If
            // this is created, then it must be executed on completion, otherwise the
            // pos-transition redraw will not execute:
            onComplete = makeOnCompleteCallback();
        }

        const transition = d3Transition()
            .duration(transitionOpts.duration)
            .ease(transitionOpts.easing)
            .on('end', function () {
                onComplete && onComplete();
            })
            .on('interrupt', function () {
                onComplete && onComplete();
            });

        transition.each(function () {
            // Must run the selection again since otherwise enters/updates get grouped together
            // and these get executed out of order. Except we need them in order!
            layer.selectAll('g.trace').each(function (this: any, cd: any) {
                plotOne(gd, cd, this, transitionOpts);
            });
        });
    } else {
        join.each(function (this: any, cd: any) {
            plotOne(gd, cd, this, transitionOpts);
        });

        if (fullLayout.uniformtext.mode) {
            resizeText(gd, fullLayout._sunburstlayer.selectAll('.trace'), 'sunburst');
        }
    }

    if (isFullReplot) {
        joinExit.remove();
    }
}

function plotOne(gd: GraphDiv, cd: any[], element: Element, transitionOpts: any) {
    const isStatic = gd._context.staticPlot;

    const fullLayout = gd._fullLayout;
    const hasTransition = !fullLayout.uniformtext.mode && helpers.hasTransition(transitionOpts);

    const gTrace = select(element);
    let slices = gTrace.selectAll('g.slice');

    const cd0 = cd[0];
    const trace = cd0.trace;
    const hierarchy = cd0.hierarchy;
    const entry = helpers.findEntryWithLevel(hierarchy, trace.level);
    const maxDepth = helpers.getMaxDepth(trace);

    const gs = fullLayout._size;
    const domain = trace.domain;
    const vpw = gs.w * (domain.x[1] - domain.x[0]);
    const vph = gs.h * (domain.y[1] - domain.y[0]);
    const rMax = 0.5 * Math.min(vpw, vph);
    const cx = (cd0.cx = gs.l + (gs.w * (domain.x[1] + domain.x[0])) / 2);
    const cy = (cd0.cy = gs.t + gs.h * (1 - domain.y[0]) - vph / 2);

    if (!entry) {
        return slices.remove();
    }

    // previous root 'pt' (can be empty)
    let prevEntry: any = null;
    // stash of 'previous' position data used by tweening functions
    const prevLookup: any = {};

    if (hasTransition) {
        // Important: do this before binding new sliceData!
        slices.each(function (pt: any) {
            prevLookup[helpers.getPtId(pt)] = {
                rpx0: pt.rpx0,
                rpx1: pt.rpx1,
                x0: pt.x0,
                x1: pt.x1,
                transform: pt.transform
            };

            if (!prevEntry && helpers.isEntry(pt)) {
                prevEntry = pt;
            }
        });
    }

    // N.B. slice data isn't the calcdata,
    // grab corresponding calcdata item in sliceData[i].data.data
    let sliceData = partition(entry).descendants();

    let maxHeight = entry.height + 1;
    let yOffset = 0;
    let cutoff = maxDepth;
    // N.B. handle multiple-root special case
    if (cd0.hasMultipleRoots && helpers.isHierarchyRoot(entry)) {
        sliceData = sliceData.slice(1);
        maxHeight -= 1;
        yOffset = 1;
        cutoff += 1;
    }

    // filter out slices that won't show up on graph
    sliceData = sliceData.filter((pt: any) => pt.y1 <= cutoff);

    const baseX = getRotationAngle(trace.rotation);
    if (baseX) {
        sliceData.forEach((pt: any) => {
            pt.x0 += baseX;
            pt.x1 += baseX;
        });
    }

    // partition span ('y') to sector radial px value
    const maxY = Math.min(maxHeight, maxDepth);
    const y2rpx = function (y: any) {
        return ((y - yOffset) / maxY) * rMax;
    };
    // (radial px value, partition angle ('x'))  to px [x,y]
    const rx2px = function (r: any, x: any) {
        return [r * Math.cos(x), -r * Math.sin(x)];
    };
    // slice path generation fn
    const pathSlice = function (d: any) {
        return Lib.pathAnnulus(d.rpx0, d.rpx1, d.x0, d.x1, cx, cy);
    };
    // slice text translate x/y

    const getTargetX = function (d: any) {
        return cx + getTextXY(d)[0] * (d.transform.rCenter || 0) + (d.transform.x || 0);
    };
    const getTargetY = function (d: any) {
        return cy + getTextXY(d)[1] * (d.transform.rCenter || 0) + (d.transform.y || 0);
    };

    slices = slices.data(sliceData, helpers.getPtId);

    const slicesEnter = slices.enter().append('g').classed('slice', true);

    if (hasTransition) {
        slices
            .exit()
            .transition()
            .each(function (this: any) {
                const sliceTop = select(this);

                const slicePath = sliceTop.select('path.surface');
                slicePath.transition().attrTween('d', function (pt2: any) {
                    const interp = makeExitSliceInterpolator(pt2);
                    return function (t: any) {
                        return pathSlice(interp(t));
                    };
                });

                const sliceTextGroup = sliceTop.select('g.slicetext');
                sliceTextGroup.attr('opacity', 0);
            })
            .remove();
    } else {
        slices.exit().remove();
    }

    slices = slices.merge(slicesEnter);
    slices.order();

    // next x1 (i.e. sector end angle) of previous entry
    let nextX1ofPrevEntry: any = null;
    if (hasTransition && prevEntry) {
        const prevEntryId = helpers.getPtId(prevEntry);
        slices.each(function (pt: any) {
            if (nextX1ofPrevEntry === null && helpers.getPtId(pt) === prevEntryId) {
                nextX1ofPrevEntry = pt.x1;
            }
        });
    }

    let updateSlices = slices;
    if (hasTransition) {
        updateSlices = updateSlices.transition().on('end', function (this: any) {
            // N.B. gd._transitioning is (still) *true* by the time
            // transition updates get here
            const sliceTop = select(this);
            helpers.setSliceCursor(sliceTop, gd, {
                hideOnRoot: true,
                hideOnLeaves: true,
                isTransitioning: false
            });
        });
    }

    updateSlices.each(function (this: any, pt: any) {
        const sliceTop = select(this);

        const slicePath = Lib.ensureSingle(sliceTop, 'path', 'surface', function (s: any) {
            s.style('pointer-events', isStatic ? 'none' : 'all');
        });

        pt.rpx0 = y2rpx(pt.y0);
        pt.rpx1 = y2rpx(pt.y1);
        pt.xmid = (pt.x0 + pt.x1) / 2;
        pt.pxmid = rx2px(pt.rpx1, pt.xmid);
        pt.midangle = -(pt.xmid - Math.PI / 2);
        pt.startangle = -(pt.x0 - Math.PI / 2);
        pt.stopangle = -(pt.x1 - Math.PI / 2);
        pt.halfangle = 0.5 * Math.min(Lib.angleDelta(pt.x0, pt.x1) || Math.PI, Math.PI);
        pt.ring = 1 - pt.rpx0 / pt.rpx1;
        // @ts-expect-error getInscribedRadiusFraction uses only first arg
        pt.rInscribed = getInscribedRadiusFraction(pt, trace);

        if (hasTransition) {
            slicePath.transition().attrTween('d', function (pt2: any) {
                const interp = makeUpdateSliceInterpolator(pt2);
                return function (t: any) {
                    return pathSlice(interp(t));
                };
            });
        } else {
            slicePath.attr('d', pathSlice);
        }

        sliceTop
            .call(attachFxHandlers, entry, gd, cd, {
                eventDataKeys: constants.eventDataKeys,
                transitionTime: constants.CLICK_TRANSITION_TIME,
                transitionEasing: constants.CLICK_TRANSITION_EASING
            })
            .call(helpers.setSliceCursor, gd, {
                hideOnRoot: true,
                hideOnLeaves: true,
                isTransitioning: gd._transitioning
            });

        slicePath.call(styleOne, pt, trace, gd);

        const sliceTextGroup = Lib.ensureSingle(sliceTop, 'g', 'slicetext');
        const sliceText = Lib.ensureSingle(sliceTextGroup, 'text', '', function (s: any) {
            // prohibit tex interpretation until we can handle
            // tex and regular text together
            s.attr('data-notex', 1);
        });

        // @ts-expect-error determineTextFont accepts optional 4th arg
        const font = Lib.ensureUniformFontSize(gd, helpers.determineTextFont(trace, pt, fullLayout.font));

        sliceText
            .text(formatSliceLabel(pt, entry, trace, cd, fullLayout))
            .classed('slicetext', true)
            .attr('text-anchor', 'middle')
            .call(drawingFont, font)
            .call(svgTextUtils.convertToTspans, gd);

        // position the text relative to the slice
        const textBB = bBox(sliceText.node());
        pt.transform = transformInsideText(textBB, pt, cd0);
        pt.transform.targetX = getTargetX(pt);
        pt.transform.targetY = getTargetY(pt);

        const strTransform = function (d: any, textBB: any) {
            const transform = d.transform;
            computeTransform(transform, textBB);

            transform.fontSize = font.size;
            recordMinTextSize(trace.type, transform, fullLayout);

            return Lib.getTextTransform(transform);
        };

        if (hasTransition) {
            sliceText.transition().attrTween('transform', function (pt2: any) {
                const interp = makeUpdateTextInterpolator(pt2);
                return function (t: any) {
                    return strTransform(interp(t), textBB);
                };
            });
        } else {
            sliceText.attr('transform', strTransform(pt, textBB));
        }
    });

    function makeExitSliceInterpolator(pt: any) {
        const id = helpers.getPtId(pt);
        const prev = prevLookup[id];
        const entryPrev = prevLookup[helpers.getPtId(entry)];
        let next;

        if (entryPrev) {
            const a = (pt.x1 > entryPrev.x1 ? 2 * Math.PI : 0) + baseX;
            // if pt to remove:
            // - if 'below' where the root-node used to be: shrink it radially inward
            // - otherwise, collapse it clockwise or counterclockwise which ever is shortest to theta=0
            next =
                pt.rpx1 < entryPrev.rpx1
                    ? { x0: pt.x0, x1: pt.x1, rpx0: 0, rpx1: 0 }
                    : { x0: a, x1: a, rpx0: pt.rpx0, rpx1: pt.rpx1 };
        } else {
            // this happens when maxdepth is set, when leaves must
            // be removed and the rootPt is new (i.e. does not have a 'prev' object)
            let parent: any;
            const parentId = helpers.getPtId(pt.parent);
            slices.each(function (pt2: any) {
                if (helpers.getPtId(pt2) === parentId) {
                    return (parent = pt2);
                }
            });
            const parentChildren = parent.children;
            let ci: any;
            parentChildren.forEach((pt2: any, i: any) => {
                if (helpers.getPtId(pt2) === id) {
                    return (ci = i);
                }
            });
            const n = parentChildren.length;
            const interp = interpolate(parent.x0, parent.x1);
            next = {
                rpx0: rMax,
                rpx1: rMax,
                x0: interp(ci / n),
                x1: interp((ci + 1) / n)
            };
        }

        return interpolate(prev, next);
    }

    function makeUpdateSliceInterpolator(pt: any) {
        const prev0 = prevLookup[helpers.getPtId(pt)];
        let prev;
        const next = { x0: pt.x0, x1: pt.x1, rpx0: pt.rpx0, rpx1: pt.rpx1 };

        if (prev0) {
            // if pt already on graph, this is easy
            prev = prev0;
        } else {
            // for new pts:
            if (prevEntry) {
                // if trace was visible before
                if (pt.parent) {
                    if (nextX1ofPrevEntry) {
                        // if new branch, twist it in clockwise or
                        // counterclockwise which ever is shorter to
                        // its final angle
                        const a = (pt.x1 > nextX1ofPrevEntry ? 2 * Math.PI : 0) + baseX;
                        prev = { x0: a, x1: a };
                    } else {
                        // if new leaf (when maxdepth is set),
                        // grow it radially and angularly from
                        // its parent node
                        prev = { rpx0: rMax, rpx1: rMax };
                        Lib.extendFlat(prev, interpX0X1FromParent(pt));
                    }
                } else {
                    // if new root-node, grow it radially
                    prev = { rpx0: 0, rpx1: 0 };
                }
            } else {
                // start sector of new traces from theta=0
                prev = { x0: baseX, x1: baseX };
            }
        }

        return interpolate(prev, next);
    }

    function makeUpdateTextInterpolator(pt: any) {
        const prev0 = prevLookup[helpers.getPtId(pt)];
        let prev: any;
        const transform = pt.transform;

        if (prev0) {
            prev = prev0;
        } else {
            prev = {
                rpx1: pt.rpx1,
                transform: {
                    textPosAngle: transform.textPosAngle,
                    scale: 0,
                    rotate: transform.rotate,
                    rCenter: transform.rCenter,
                    x: transform.x,
                    y: transform.y
                }
            };

            // for new pts:
            if (prevEntry) {
                // if trace was visible before
                if (pt.parent) {
                    if (nextX1ofPrevEntry) {
                        // if new branch, twist it in clockwise or
                        // counterclockwise which ever is shorter to
                        // its final angle
                        const a = pt.x1 > nextX1ofPrevEntry ? 2 * Math.PI : 0;
                        prev.x0 = prev.x1 = a;
                    } else {
                        // if leaf
                        Lib.extendFlat(prev, interpX0X1FromParent(pt));
                    }
                } else {
                    // if new root-node
                    prev.x0 = prev.x1 = baseX;
                }
            } else {
                // on new traces
                prev.x0 = prev.x1 = baseX;
            }
        }

        const textPosAngleFn = interpolate(prev.transform.textPosAngle, pt.transform.textPosAngle);
        const rpx1Fn = interpolate(prev.rpx1, pt.rpx1);
        const x0Fn = interpolate(prev.x0, pt.x0);
        const x1Fn = interpolate(prev.x1, pt.x1);
        const scaleFn = interpolate(prev.transform.scale, transform.scale);
        const rotateFn = interpolate(prev.transform.rotate, transform.rotate);

        // smooth out start/end from entry, to try to keep text inside sector
        // while keeping transition smooth
        const pow = transform.rCenter === 0 ? 3 : prev.transform.rCenter === 0 ? 1 / 3 : 1;
        const _rCenterFn = interpolate(prev.transform.rCenter, transform.rCenter);
        const rCenterFn = function (t: any) {
            return _rCenterFn(Math.pow(t, pow));
        };

        return function (t: any) {
            const rpx1 = rpx1Fn(t);
            const x0 = x0Fn(t);
            const x1 = x1Fn(t);
            const rCenter = rCenterFn(t);
            const pxmid = rx2px(rpx1, (x0 + x1) / 2);
            const textPosAngle = textPosAngleFn(t);

            const d = {
                pxmid: pxmid,
                rpx1: rpx1,
                transform: {
                    textPosAngle: textPosAngle,
                    rCenter: rCenter,
                    x: transform.x,
                    y: transform.y
                }
            };

            recordMinTextSize(trace.type, transform, fullLayout);
            return {
                transform: {
                    targetX: getTargetX(d),
                    targetY: getTargetY(d),
                    scale: scaleFn(t),
                    rotate: rotateFn(t),
                    rCenter: rCenter
                }
            };
        };
    }

    function interpX0X1FromParent(pt: any) {
        const parent = pt.parent;
        const parentPrev = prevLookup[helpers.getPtId(parent)];
        const out: Record<string, any> = {};

        if (parentPrev) {
            // if parent is visible
            const parentChildren = parent.children;
            const ci = parentChildren.indexOf(pt);
            const n = parentChildren.length;
            const interp = interpolate(parentPrev.x0, parentPrev.x1);
            out.x0 = interp(ci / n);
            out.x1 = interp(ci / n);
        } else {
            // w/o visible parent
            // TODO !!! HOW ???
            out.x0 = out.x1 = 0;
        }

        return out;
    }
}

// x[0-1] keys are angles [radians]
// y[0-1] keys are hierarchy heights [integers]
function partition(entry: any) {
    return d3Hierarchy.partition().size([2 * Math.PI, entry.height + 1])(entry);
}

export function formatSliceLabel(pt: any, entry: any, trace: any, cd: any, fullLayout: any) {
    const texttemplate = trace.texttemplate;
    const textinfo = trace.textinfo;

    if (!texttemplate && (!textinfo || textinfo === 'none')) {
        return '';
    }

    const separators = fullLayout.separators;
    const cd0 = cd[0];
    const cdi = pt.data.data;
    const hierarchy = cd0.hierarchy;
    const isRoot = helpers.isHierarchyRoot(pt);
    const parent = helpers.getParent(hierarchy, pt);
    const val = helpers.getValue(pt);

    if (!texttemplate) {
        const parts = textinfo.split('+');
        const hasFlag = function (flag: any) {
            return parts.indexOf(flag) !== -1;
        };
        const thisText: any[] = [];
        let tx;

        if (hasFlag('label') && cdi.label) {
            thisText.push(cdi.label);
        }

        if (cdi.hasOwnProperty('v') && hasFlag('value')) {
            thisText.push(helpers.formatValue(cdi.v, separators));
        }

        if (!isRoot) {
            if (hasFlag('current path')) {
                thisText.push(helpers.getPath(pt.data));
            }

            let nPercent = 0;
            if (hasFlag('percent parent')) nPercent++;
            if (hasFlag('percent entry')) nPercent++;
            if (hasFlag('percent root')) nPercent++;
            const hasMultiplePercents = nPercent > 1;

            if (nPercent) {
                let percent: any;
                const addPercent = function (key: any) {
                    tx = helpers.formatPercent(percent, separators);

                    if (hasMultiplePercents) tx += ' of ' + key;
                    thisText.push(tx);
                };

                if (hasFlag('percent parent') && !isRoot) {
                    percent = val / helpers.getValue(parent);
                    addPercent('parent');
                }
                if (hasFlag('percent entry')) {
                    percent = val / helpers.getValue(entry);
                    addPercent('entry');
                }
                if (hasFlag('percent root')) {
                    percent = val / helpers.getValue(hierarchy);
                    addPercent('root');
                }
            }
        }

        if (hasFlag('text')) {
            tx = Lib.castOption(trace, cdi.i, 'text');
            if (Lib.isValidTextValue(tx)) thisText.push(tx);
        }

        return thisText.join('<br>');
    }

    const txt = Lib.castOption(trace, cdi.i, 'texttemplate');
    if (!txt) return '';
    const obj: Record<string, any> = {};
    if (cdi.label) obj.label = cdi.label;
    if (cdi.hasOwnProperty('v')) {
        obj.value = cdi.v;
        obj.valueLabel = helpers.formatValue(cdi.v, separators);
    }

    obj.currentPath = helpers.getPath(pt.data);

    if (!isRoot) {
        obj.percentParent = val / helpers.getValue(parent);
        obj.percentParentLabel = helpers.formatPercent(obj.percentParent, separators);
        obj.parent = helpers.getPtLabel(parent);
    }

    obj.percentEntry = val / helpers.getValue(entry);
    obj.percentEntryLabel = helpers.formatPercent(obj.percentEntry, separators);
    obj.entry = helpers.getPtLabel(entry);

    obj.percentRoot = val / helpers.getValue(hierarchy);
    obj.percentRootLabel = helpers.formatPercent(obj.percentRoot, separators);
    obj.root = helpers.getPtLabel(hierarchy);

    if (cdi.hasOwnProperty('color')) {
        obj.color = cdi.color;
    }
    const ptTx = Lib.castOption(trace, cdi.i, 'text');
    if (Lib.isValidTextValue(ptTx) || ptTx === '') obj.text = ptTx;
    obj.customdata = Lib.castOption(trace, cdi.i, 'customdata');
    return Lib.texttemplateString({
        data: [obj, trace._meta],
        fallback: trace.texttemplatefallback,
        labels: obj,
        locale: fullLayout._d3locale,
        template: txt
    });
}

function getInscribedRadiusFraction(pt: any) {
    if (pt.rpx0 === 0 && Lib.isFullCircle([pt.x0, pt.x1])) {
        // special case of 100% with no hole
        return 1;
    } else {
        return Math.max(0, Math.min(1 / (1 + 1 / Math.sin(pt.halfangle)), pt.ring / 2));
    }
}

function getTextXY(d: any) {
    return getCoords(d.rpx1, d.transform.textPosAngle);
}

function getCoords(r: any, angle: any) {
    return [r * Math.sin(angle), -r * Math.cos(angle)];
}

export default { plot, formatSliceLabel };
