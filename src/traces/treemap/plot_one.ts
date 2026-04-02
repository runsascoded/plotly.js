import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { interpolate } from 'd3-interpolate';
import helpers from '../sunburst/helpers.js';
import Lib from '../../lib/index.js';
import _constants from '../bar/constants.js';
const { TEXTPAD } = _constants;
import barPlot from '../bar/plot.js';
import uniformText from '../bar/uniform_text.js';
import constants from './constants.js';
import drawAncestors from './draw_ancestors.js';
const toMoveInsideBar = barPlot.toMoveInsideBar;
const recordMinTextSize = uniformText.recordMinTextSize;

function getKey(pt: any) {
    return helpers.isHierarchyRoot(pt) ?
        '' : // don't use the dummyId
        helpers.getPtId(pt);
}

export default function plotOne(gd: GraphDiv, cd: any[], element: Element, transitionOpts: any, drawDescendants: Function) {
    const fullLayout = gd._fullLayout;
    const cd0 = cd[0];
    const trace = cd0.trace;
    const type = trace.type;
    const isIcicle = type === 'icicle';

    const hierarchy = cd0.hierarchy;
    const entry = helpers.findEntryWithLevel(hierarchy, trace.level);

    const gTrace = select(element);
    const selAncestors = gTrace.selectAll('g.pathbar');
    const selDescendants = gTrace.selectAll('g.slice');

    if(!entry) {
        selAncestors.remove();
        selDescendants.remove();
        return;
    }

    const isRoot = helpers.isHierarchyRoot(entry);
    const hasTransition = !fullLayout.uniformtext.mode && helpers.hasTransition(transitionOpts);

    let maxDepth = helpers.getMaxDepth(trace);
    const hasVisibleDepth = (pt: any) => {
        return pt.data.depth - entry.data.depth < maxDepth;
    };

    const gs = fullLayout._size;
    const domain = trace.domain;

    const vpw = gs.w * (domain.x[1] - domain.x[0]);
    const vph = gs.h * (domain.y[1] - domain.y[0]);
    const barW = vpw;
    const barH = trace.pathbar.thickness;
    const barPad = trace.marker.line.width + constants.gapWithPathbar;
    const barDifY = !trace.pathbar.visible ? 0 :
        trace.pathbar.side.indexOf('bottom') > -1 ? vph + barPad : -(barH + barPad);

    const pathbarOrigin = {
        x0: barW, // slide to the right
        x1: barW,
        y0: barDifY,
        y1: barDifY + barH
    };

    const findClosestEdge = (pt: any, ref: any, size: any) => {
        const e = trace.tiling.pad;
        const isLeftOfRect = (x: any) => { return x - e <= ref.x0; };
        const isRightOfRect = (x: any) => { return x + e >= ref.x1; };
        const isBottomOfRect = (y: any) => { return y - e <= ref.y0; };
        const isTopOfRect = (y: any) => { return y + e >= ref.y1; };

        if(pt.x0 === ref.x0 && pt.x1 === ref.x1 && pt.y0 === ref.y0 && pt.y1 === ref.y1) {
            return {
                x0: pt.x0,
                x1: pt.x1,
                y0: pt.y0,
                y1: pt.y1
            };
        }

        return {
            x0: isLeftOfRect(pt.x0 - e) ? 0 : isRightOfRect(pt.x0 - e) ? size[0] : pt.x0,
            x1: isLeftOfRect(pt.x1 + e) ? 0 : isRightOfRect(pt.x1 + e) ? size[0] : pt.x1,
            y0: isBottomOfRect(pt.y0 - e) ? 0 : isTopOfRect(pt.y0 - e) ? size[1] : pt.y0,
            y1: isBottomOfRect(pt.y1 + e) ? 0 : isTopOfRect(pt.y1 + e) ? size[1] : pt.y1
        };
    };

    // stash of 'previous' position data used by tweening functions
    let prevEntry: any = null;
    const prevLookupPathbar : Record<string, any> = {};
    const prevLookupSlices : Record<string, any> = {};
    let nextOfPrevEntry: any = null;
    const getPrev = (pt: any, onPathbar: any) => {
        return onPathbar ?
            prevLookupPathbar[getKey(pt)] :
            prevLookupSlices[getKey(pt)];
    };

    const getOrigin = (pt: any, onPathbar: any, refRect: any, size: any) => {
        if(onPathbar) {
            return prevLookupPathbar[getKey(hierarchy)] || pathbarOrigin;
        } else {
            const ref = prevLookupSlices[trace.level] || refRect;

            if(hasVisibleDepth(pt)) { // case of an empty object - happens when maxdepth is set
                return findClosestEdge(pt, ref, size);
            }
        }
        return {};
    };

    // N.B. handle multiple-root special case
    if(cd0.hasMultipleRoots && isRoot) {
        maxDepth++;
    }

    trace._maxDepth = maxDepth;
    trace._backgroundColor = fullLayout.paper_bgcolor;
    trace._entryDepth = entry.data.depth;
    trace._atRootLevel = isRoot;

    const cenX = -vpw / 2 + gs.l + gs.w * (domain.x[1] + domain.x[0]) / 2;
    const cenY = -vph / 2 + gs.t + gs.h * (1 - (domain.y[1] + domain.y[0]) / 2);

    const viewMapX = (x: any) => { return cenX + x; };
    const viewMapY = (y: any) => { return cenY + y; };

    const barY0 = viewMapY(0);
    const barX0 = viewMapX(0);

    const viewBarX = (x: any) => { return barX0 + x; };
    const viewBarY = (y: any) => { return barY0 + y; };

    function pos(x: any, y: any) {
        return x + ',' + y;
    }

    const xStart = viewBarX(0);
    const limitX0 = (p: any) => { p.x = Math.max(xStart, p.x); };

    const edgeshape = trace.pathbar.edgeshape;

    // pathbar(directory) path generation fn
    const pathAncestor = (d: any) => {
        const _x0 = viewBarX(Math.max(Math.min(d.x0, d.x0), 0));
        const _x1 = viewBarX(Math.min(Math.max(d.x1, d.x1), barW));
        const _y0 = viewBarY(d.y0);
        const _y1 = viewBarY(d.y1);

        const halfH = barH / 2;

        const pL : Record<string, any> = {};
        const pR : Record<string, any> = {};

        pL.x = _x0;
        pR.x = _x1;

        pL.y = pR.y = (_y0 + _y1) / 2;

        const pA = {x: _x0, y: _y0};
        const pB = {x: _x1, y: _y0};
        const pC = {x: _x1, y: _y1};
        const pD = {x: _x0, y: _y1};

        if(edgeshape === '>') {
            pA.x -= halfH;
            pB.x -= halfH;
            pC.x -= halfH;
            pD.x -= halfH;
        } else if(edgeshape === '/') {
            pC.x -= halfH;
            pD.x -= halfH;
            pL.x -= halfH / 2;
            pR.x -= halfH / 2;
        } else if(edgeshape === '\\') {
            pA.x -= halfH;
            pB.x -= halfH;
            pL.x -= halfH / 2;
            pR.x -= halfH / 2;
        } else if(edgeshape === '<') {
            pL.x -= halfH;
            pR.x -= halfH;
        }

        limitX0(pA);
        limitX0(pD);
        limitX0(pL);

        limitX0(pB);
        limitX0(pC);
        limitX0(pR);

        return (
           'M' + pos(pA.x, pA.y) +
           'L' + pos(pB.x, pB.y) +
           'L' + pos(pR.x, pR.y) +
           'L' + pos(pC.x, pC.y) +
           'L' + pos(pD.x, pD.y) +
           'L' + pos(pL.x, pL.y) +
           'Z'
        );
    };

    // Note that `pad` is just an integer for `icicle`` traces where
    // `pad` is a hashmap for treemap: pad.t, pad.b, pad.l, and pad.r
    const pad = trace[isIcicle ? 'tiling' : 'marker'].pad;

    const hasFlag = (f: any) => { return trace.textposition.indexOf(f) !== -1; };

    const hasTop = hasFlag('top');
    const hasLeft = hasFlag('left');
    const hasRight = hasFlag('right');
    const hasBottom = hasFlag('bottom');

    // slice path generation fn
    const pathDescendant = (d: any) => {
        const _x0 = viewMapX(d.x0);
        const _x1 = viewMapX(d.x1);
        const _y0 = viewMapY(d.y0);
        const _y1 = viewMapY(d.y1);

        const dx = _x1 - _x0;
        const dy = _y1 - _y0;
        if(!dx || !dy) return '';

        const cornerradius = trace.marker.cornerradius || 0;
        let r = Math.min(cornerradius, dx / 2, dy / 2);
        if(
            r &&
            d.data &&
            d.data.data &&
            d.data.data.label
        ) {
            if(hasTop) r = Math.min(r, pad.t);
            if(hasLeft) r = Math.min(r, pad.l);
            if(hasRight) r = Math.min(r, pad.r);
            if(hasBottom) r = Math.min(r, pad.b);
        }

        const arc = (rx: any, ry: any) => { return r ? 'a' + pos(r, r) + ' 0 0 1 ' + pos(rx, ry) : ''; };

        return (
           'M' + pos(_x0, _y0 + r) +
           arc(r, -r) +
           'L' + pos(_x1 - r, _y0) +
           arc(r, r) +
           'L' + pos(_x1, _y1 - r) +
           arc(-r, r) +
           'L' + pos(_x0 + r, _y1) +
           arc(-r, -r) + 'Z'
        );
    };

    const toMoveInsideSlice = (pt: any, opts: any) => {
        let x0 = pt.x0;
        let x1 = pt.x1;
        let y0 = pt.y0;
        let y1 = pt.y1;
        const textBB = pt.textBB;

        const _hasTop = hasTop || (opts.isHeader && !hasBottom);

        const anchor =
            _hasTop ? 'start' :
            hasBottom ? 'end' : 'middle';

        const _hasRight = hasFlag('right');
        const _hasLeft = hasFlag('left') || opts.onPathbar;

        const leftToRight =
            _hasLeft ? -1 :
            _hasRight ? 1 : 0;

        if(opts.isHeader) {
            x0 += (isIcicle ? pad : pad.l) - TEXTPAD;
            x1 -= (isIcicle ? pad : pad.r) - TEXTPAD;
            if(x0 >= x1) {
                const mid = (x0 + x1) / 2;
                x0 = mid;
                x1 = mid;
            }

            // limit the drawing area for headers
            let limY;
            if(hasBottom) {
                limY = y1 - (isIcicle ? pad : pad.b);
                if(y0 < limY && limY < y1) y0 = limY;
            } else {
                limY = y0 + (isIcicle ? pad : pad.t);
                if(y0 < limY && limY < y1) y1 = limY;
            }
        }

        // position the text relative to the slice
        const transform = toMoveInsideBar(x0, x1, y0, y1, textBB, {
            isHorizontal: false,
            constrained: true,
            angle: 0,
            anchor: anchor,
            leftToRight: leftToRight
        });
        transform.fontSize = opts.fontSize;

        transform.targetX = viewMapX(transform.targetX);
        transform.targetY = viewMapY(transform.targetY);

        if(isNaN(transform.targetX) || isNaN(transform.targetY)) {
            return {};
        }

        if(x0 !== x1 && y0 !== y1) {
            recordMinTextSize(trace.type, transform, fullLayout);
        }

        return {
            scale: transform.scale,
            rotate: transform.rotate,
            textX: transform.textX,
            textY: transform.textY,
            anchorX: transform.anchorX,
            anchorY: transform.anchorY,
            targetX: transform.targetX,
            targetY: transform.targetY
        };
    };

    const interpFromParent = (pt: any, onPathbar: any) => {
        let parentPrev;
        let i = 0;
        let Q = pt;
        while(!parentPrev && i < maxDepth) { // loop to find a parent/grandParent on the previous graph
            i++;
            Q = Q.parent;
            if(Q) {
                parentPrev = getPrev(Q, onPathbar);
            } else i = maxDepth;
        }
        return parentPrev || {};
    };

    const makeExitSliceInterpolator = function(pt: any, onPathbar: any, refRect: any, size: any) {
        const prev = getPrev(pt, onPathbar);
        let next;

        if(onPathbar) {
            next = pathbarOrigin;
        } else {
            const entryPrev = getPrev(entry, onPathbar);
            if(entryPrev) {
                // 'entryPrev' is here has the previous coordinates of the entry
                // node, which corresponds to the last "clicked" node when zooming in
                next = findClosestEdge(pt, entryPrev, size);
            } else {
                // this happens when maxdepth is set, when leaves must
                // be removed and the entry is new (i.e. does not have a 'prev' object)
                next = {} as any;
            }
        }

        return interpolate(prev, next);
    };

    const makeUpdateSliceInterpolator = function(pt: any, onPathbar: any, refRect: any, size: any, opts: any) {
        const prev0 = getPrev(pt, onPathbar);
        let prev;

        if(prev0) {
            // if pt already on graph, this is easy
            prev = prev0;
        } else {
            // for new pts:
            if(onPathbar) {
                prev = pathbarOrigin;
            } else {
                if(prevEntry) {
                    // if trace was visible before
                    if(pt.parent) {
                        const ref = nextOfPrevEntry || refRect;

                        if(ref && !onPathbar) {
                            prev = findClosestEdge(pt, ref, size);
                        } else {
                            // if new leaf (when maxdepth is set),
                            // grow it from its parent node
                            prev = {} as any;
                            Lib.extendFlat(prev, interpFromParent(pt, onPathbar));
                        }
                    } else {
                        prev = Lib.extendFlat({}, pt);
                        if(isIcicle) {
                            if(opts.orientation === 'h') {
                                if(opts.flipX) prev.x0 = pt.x1;
                                else prev.x1 = 0;
                            } else {
                                if(opts.flipY) prev.y0 = pt.y1;
                                else prev.y1 = 0;
                            }
                        }
                    }
                } else {
                    prev = {} as any;
                }
            }
        }

        return interpolate(prev, {
            x0: pt.x0,
            x1: pt.x1,
            y0: pt.y0,
            y1: pt.y1
        });
    };

    const makeUpdateTextInterpolator = function(pt: any, onPathbar: any, refRect: any, size: any) {
        const prev0 = getPrev(pt, onPathbar);
        let prev : Record<string, any> = {};
        const origin = getOrigin(pt, onPathbar, refRect, size);

        Lib.extendFlat(prev, {
            transform: toMoveInsideSlice({
                x0: origin.x0,
                x1: origin.x1,
                y0: origin.y0,
                y1: origin.y1,
                textBB: pt.textBB,
                _text: pt._text
            }, {
                isHeader: helpers.isHeader(pt, trace)
            })
        });

        if(prev0) {
            // if pt already on graph, this is easy
            prev = prev0;
        } else {
            // for new pts:
            if(pt.parent) {
                Lib.extendFlat(prev, interpFromParent(pt, onPathbar));
            }
        }

        const transform = pt.transform;
        if(pt.x0 !== pt.x1 && pt.y0 !== pt.y1) {
            recordMinTextSize(trace.type, transform, fullLayout);
        }

        return interpolate(prev, {
            transform: {
                scale: transform.scale,
                rotate: transform.rotate,
                textX: transform.textX,
                textY: transform.textY,
                anchorX: transform.anchorX,
                anchorY: transform.anchorY,
                targetX: transform.targetX,
                targetY: transform.targetY
            }
        });
    };

    const handleSlicesExit = function(slices: any, onPathbar: any, refRect: any, size: any, pathSlice: any) {
        const width = size[0];
        const height = size[1];

        if(hasTransition) {
            slices.exit().transition()
                .each(function(this: any) {
                    const sliceTop = select(this);

                    const slicePath = sliceTop.select('path.surface');
                    slicePath.transition().attrTween('d', function(pt2: any) {
                        const interp = makeExitSliceInterpolator(pt2, onPathbar, refRect, [width, height]);
                        return function(t: any) { return pathSlice(interp(t)); };
                    });

                    const sliceTextGroup = sliceTop.select('g.slicetext');
                    sliceTextGroup.attr('opacity', 0);
                })
                .remove();
        } else {
            slices.exit().remove();
        }
    };

    const strTransform = (d: any) => {
        const transform = d.transform;

        if(d.x0 !== d.x1 && d.y0 !== d.y1) {
            recordMinTextSize(trace.type, transform, fullLayout);
        }

        return Lib.getTextTransform({
            textX: transform.textX,
            textY: transform.textY,
            anchorX: transform.anchorX,
            anchorY: transform.anchorY,
            targetX: transform.targetX,
            targetY: transform.targetY,
            scale: transform.scale,
            rotate: transform.rotate
        });
    };

    if(hasTransition) {
        // Important: do this before binding new sliceData!

        selAncestors.each(function(pt: any) {
            prevLookupPathbar[getKey(pt)] = {
                x0: pt.x0,
                x1: pt.x1,
                y0: pt.y0,
                y1: pt.y1
            };

            if(pt.transform) {
                prevLookupPathbar[getKey(pt)].transform = {
                    textX: pt.transform.textX,
                    textY: pt.transform.textY,
                    anchorX: pt.transform.anchorX,
                    anchorY: pt.transform.anchorY,
                    targetX: pt.transform.targetX,
                    targetY: pt.transform.targetY,
                    scale: pt.transform.scale,
                    rotate: pt.transform.rotate
                };
            }
        });

        selDescendants.each(function(pt: any) {
            prevLookupSlices[getKey(pt)] = {
                x0: pt.x0,
                x1: pt.x1,
                y0: pt.y0,
                y1: pt.y1
            };

            if(pt.transform) {
                prevLookupSlices[getKey(pt)].transform = {
                    textX: pt.transform.textX,
                    textY: pt.transform.textY,
                    anchorX: pt.transform.anchorX,
                    anchorY: pt.transform.anchorY,
                    targetX: pt.transform.targetX,
                    targetY: pt.transform.targetY,
                    scale: pt.transform.scale,
                    rotate: pt.transform.rotate
                };
            }

            if(!prevEntry && helpers.isEntry(pt)) {
                prevEntry = pt;
            }
        });
    }

    nextOfPrevEntry = drawDescendants(gd, cd, entry, selDescendants, {
        width: vpw,
        height: vph,

        viewX: viewMapX,
        viewY: viewMapY,

        pathSlice: pathDescendant,
        toMoveInsideSlice: toMoveInsideSlice,

        prevEntry: prevEntry,
        makeUpdateSliceInterpolator: makeUpdateSliceInterpolator,
        makeUpdateTextInterpolator: makeUpdateTextInterpolator,

        handleSlicesExit: handleSlicesExit,
        hasTransition: hasTransition,
        strTransform: strTransform
    });

    if(trace.pathbar.visible) {
        drawAncestors(gd, cd, entry, selAncestors, {
            barDifY: barDifY,
            width: barW,
            height: barH,

            viewX: viewBarX,
            viewY: viewBarY,

            pathSlice: pathAncestor,
            toMoveInsideSlice: toMoveInsideSlice,

            makeUpdateSliceInterpolator: makeUpdateSliceInterpolator,
            makeUpdateTextInterpolator: makeUpdateTextInterpolator,

            handleSlicesExit: handleSlicesExit,
            hasTransition: hasTransition,
            strTransform: strTransform
        });
    } else {
        selAncestors.remove();
    }
}
