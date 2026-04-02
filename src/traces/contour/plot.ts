import type { GraphDiv, PlotInfo } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import { bBox, font, setClipUrl, smoothclosed, smoothopen, tester } from '../../components/drawing/index.js';
import Colorscale from '../../components/colorscale/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import Axes from '../../plots/cartesian/axes.js';
import setConvert from '../../plots/cartesian/set_convert.js';
import heatmapPlot from '../heatmap/plot.js';
import makeCrossings from './make_crossings.js';
import findAllPaths from './find_all_paths.js';
import emptyPathinfo from './empty_pathinfo.js';
import convertToConstraints from './convert_to_constraints.js';
import closeBoundaries from './close_boundaries.js';
import constants from './constants.js';
const costConstants = constants.LABELOPTIMIZER;

export const plot = function plot(gd: GraphDiv,  plotinfo: PlotInfo,  cdcontours,  contourLayer) {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    Lib.makeTraceGroups(contourLayer, cdcontours, 'contour').each(function(this: any, cd) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;
        const x = cd0.x;
        const y = cd0.y;
        const contours = trace.contours;
        const pathinfo = emptyPathinfo(contours, plotinfo, cd0);

        // use a heatmap to fill - draw it behind the lines
        const heatmapColoringLayer = Lib.ensureSingle(plotGroup, 'g', 'heatmapcoloring');
        let cdheatmaps: any[] = [];
        if(contours.coloring === 'heatmap') {
            cdheatmaps = ([cd] as any);
        }
        heatmapPlot(gd, plotinfo, cdheatmaps, heatmapColoringLayer);

        makeCrossings(pathinfo);
        findAllPaths(pathinfo);

        const leftedge = xa.c2p(x[0], true);
        const rightedge = xa.c2p(x[x.length - 1], true);
        const bottomedge = ya.c2p(y[0], true);
        const topedge = ya.c2p(y[y.length - 1], true);
        const perimeter = [
            [leftedge, topedge],
            [rightedge, topedge],
            [rightedge, bottomedge],
            [leftedge, bottomedge]
        ];

        let fillPathinfo = pathinfo;
        if(contours.type === 'constraint') {
            // N.B. this also mutates pathinfo
            fillPathinfo = convertToConstraints(pathinfo, contours._operation);
        }

        // draw everything
        makeBackground(plotGroup, perimeter, contours);
        makeFills(plotGroup, fillPathinfo, perimeter, contours);
        makeLinesAndLabels(plotGroup, pathinfo, gd, cd0, contours);
        clipGaps(plotGroup, plotinfo, gd, cd0, perimeter);
    });
};

function makeBackground(plotgroup,  perimeter,  contours) {
    const bggroup = Lib.ensureSingle(plotgroup, 'g', 'contourbg');

    const bgfill = bggroup.selectAll('path')
        .data(contours.coloring === 'fill' ? [0] : []);
    bgfill.enter().append('path');
    bgfill.exit().remove();
    bgfill
        .attr('d', 'M' + perimeter.join('L') + 'Z')
        .style('stroke', 'none');
}

function makeFills(plotgroup,  pathinfo,  perimeter,  contours) {
    const hasFills = contours.coloring === 'fill' || (contours.type === 'constraint' && contours._operation !== '=');
    const boundaryPath = 'M' + perimeter.join('L') + 'Z';

    // fills prefixBoundary in pathinfo items
    if(hasFills) {
        closeBoundaries(pathinfo, contours);
    }

    const fillgroup = Lib.ensureSingle(plotgroup, 'g', 'contourfill');

    const fillitems = fillgroup.selectAll('path').data(hasFills ? pathinfo : []);
    fillitems.enter().append('path');
    fillitems.exit().remove();
    fillitems.each(function(this: any, pi) {
        // join all paths for this level together into a single path
        // first follow clockwise around the perimeter to close any open paths
        // if the whole perimeter is above this level, start with a path
        // enclosing the whole thing. With all that, the parity should mean
        // that we always fill everything above the contour, nothing below
        const fullpath = (pi.prefixBoundary ? boundaryPath : '') +
            joinAllPaths(pi, perimeter);

        if(!fullpath) {
            select(this).remove();
        } else {
            select(this)
                .attr('d', fullpath)
                .style('stroke', 'none');
        }
    });
}

function joinAllPaths(pi,  perimeter) {
    let fullpath = '';
    let i = 0;
    const startsleft = pi.edgepaths.map(function(v, i) { return i; });
    let newloop = true;
    let endpt;
    let newendpt;
    let cnt;
    let nexti;
    let possiblei;
    let addpath;

    function istop(pt) { return Math.abs(pt[1] - perimeter[0][1]) < 0.01; }
    function isbottom(pt) { return Math.abs(pt[1] - perimeter[2][1]) < 0.01; }
    function isleft(pt) { return Math.abs(pt[0] - perimeter[0][0]) < 0.01; }
    function isright(pt) { return Math.abs(pt[0] - perimeter[2][0]) < 0.01; }

    while(startsleft.length) {
        addpath = smoothopen(pi.edgepaths[i], pi.smoothing);
        fullpath += newloop ? addpath : addpath.replace(/^M/, 'L');
        startsleft.splice(startsleft.indexOf(i), 1);
        endpt = pi.edgepaths[i][pi.edgepaths[i].length - 1];
        nexti = -1;

        // now loop through sides, moving our endpoint until we find a new start
        for(cnt = 0; cnt < 4; cnt++) { // just to prevent infinite loops
            if(!endpt) {
                Lib.log('Missing end?', i, pi);
                break;
            }

            if(istop(endpt) && !isright(endpt)) newendpt = perimeter[1]; // right top
            else if(isleft(endpt)) newendpt = perimeter[0]; // left top
            else if(isbottom(endpt)) newendpt = perimeter[3]; // right bottom
            else if(isright(endpt)) newendpt = perimeter[2]; // left bottom

            for(possiblei = 0; possiblei < pi.edgepaths.length; possiblei++) {
                const ptNew = pi.edgepaths[possiblei][0];
                // is ptNew on the (horz. or vert.) segment from endpt to newendpt?
                if(Math.abs(endpt[0] - newendpt[0]) < 0.01) {
                    if(Math.abs(endpt[0] - ptNew[0]) < 0.01 &&
                            (ptNew[1] - endpt[1]) * (newendpt[1] - ptNew[1]) >= 0) {
                        newendpt = ptNew;
                        nexti = possiblei;
                    }
                } else if(Math.abs(endpt[1] - newendpt[1]) < 0.01) {
                    if(Math.abs(endpt[1] - ptNew[1]) < 0.01 &&
                            (ptNew[0] - endpt[0]) * (newendpt[0] - ptNew[0]) >= 0) {
                        newendpt = ptNew;
                        nexti = possiblei;
                    }
                } else {
                    Lib.log('endpt to newendpt is not vert. or horz.',
                        endpt, newendpt, ptNew);
                }
            }

            endpt = newendpt;

            if(nexti >= 0) break;
            fullpath += 'L' + newendpt;
        }

        if(nexti === pi.edgepaths.length) {
            Lib.log('unclosed perimeter path');
            break;
        }

        i = nexti;

        // if we closed back on a loop we already included,
        // close it and start a new loop
        newloop = (startsleft.indexOf(i) === -1);
        if(newloop) {
            i = startsleft[0];
            fullpath += 'Z';
        }
    }

    // finally add the interior paths
    for(i = 0; i < pi.paths.length; i++) {
        fullpath += smoothclosed(pi.paths[i], pi.smoothing);
    }

    return fullpath;
}

function makeLinesAndLabels(plotgroup,  pathinfo,  gd: GraphDiv,  cd0,  contours) {
    const isStatic = gd._context.staticPlot;
    const lineContainer = Lib.ensureSingle(plotgroup, 'g', 'contourlines');
    const showLines = contours.showlines !== false;
    const showLabels = contours.showlabels;
    const clipLinesForLabels = showLines && showLabels;

    // Even if we're not going to show lines, we need to create them
    // if we're showing labels, because the fill paths include the perimeter
    // so can't be used to position the labels correctly.
    // In this case we'll remove the lines after making the labels.
    const linegroup = createLines(lineContainer, showLines || showLabels, pathinfo, isStatic);

    const lineClip = createLineClip(lineContainer, clipLinesForLabels, gd, cd0.trace.uid);

    const labelGroup = plotgroup.selectAll('g.contourlabels')
        .data(showLabels ? [0] : []);

    labelGroup.exit().remove();

    labelGroup.enter().append('g')
        .classed('contourlabels', true);

    if(showLabels) {
        const labelClipPathData: any[] = [];
        const labelData = [];

        // invalidate the getTextLocation cache in case paths changed
        Lib.clearLocationCache();

        const contourFormat = labelFormatter(gd, cd0);

        const dummyText = tester.append('text')
            .attr('data-notex', 1)
            .call(font, contours.labelfont);

        const xa = pathinfo[0].xaxis;
        const ya = pathinfo[0].yaxis;
        const xLen = xa._length;
        const yLen = ya._length;
        const xRng = xa.range;
        const yRng = ya.range;
        const xMin = Lib.aggNums(Math.min, null, cd0.x);
        const xMax = Lib.aggNums(Math.max, null, cd0.x);
        const yMin = Lib.aggNums(Math.min, null, cd0.y);
        const yMax = Lib.aggNums(Math.max, null, cd0.y);
        const x0 = Math.max(xa.c2p(xMin, true), 0);
        const x1 = Math.min(xa.c2p(xMax, true), xLen);
        const y0 = Math.max(ya.c2p(yMax, true), 0);
        const y1 = Math.min(ya.c2p(yMin, true), yLen);

        // visible bounds of the contour trace (and the midpoints, to
        // help with cost calculations)
        const bounds: any = {};

        if(xRng[0] < xRng[1]) {
            bounds.left = x0;
            bounds.right = x1;
        } else {
            bounds.left = x1;
            bounds.right = x0;
        }

        if(yRng[0] < yRng[1]) {
            bounds.top = y0;
            bounds.bottom = y1;
        } else {
            bounds.top = y1;
            bounds.bottom = y0;
        }

        bounds.middle = (bounds.top + bounds.bottom) / 2;
        bounds.center = (bounds.left + bounds.right) / 2;

        labelClipPathData.push([
            [bounds.left, bounds.top],
            [bounds.right, bounds.top],
            [bounds.right, bounds.bottom],
            [bounds.left, bounds.bottom]
        ]);

        const plotDiagonal = Math.sqrt(xLen * xLen + yLen * yLen);

        // the path length to use to scale the number of labels to draw:
        const normLength = constants.LABELDISTANCE * plotDiagonal /
            Math.max(1, pathinfo.length / constants.LABELINCREASE);

        linegroup.each(function(this: any, d) {
            const textOpts = calcTextOpts(d.level, contourFormat, dummyText, gd);

            select(this).selectAll('path').each(function(this: any) {
                const path = this;
                const pathBounds = Lib.getVisibleSegment(path, bounds, textOpts.height / 2);
                if(!pathBounds) return;

                if(pathBounds.len < (textOpts.width + textOpts.height) * constants.LABELMIN) return;

                const maxLabels = Math.min(Math.ceil(pathBounds.len / normLength),
                    constants.LABELMAX);

                for(let i = 0; i < maxLabels; i++) {
                    const loc = findBestTextLocation(path, pathBounds, textOpts,
                        labelData, bounds);

                    if(!loc) break;

                    addLabelData(loc, textOpts, labelData, labelClipPathData);
                }
            });
        });

        dummyText.remove();

        drawLabels(labelGroup, labelData, gd, lineClip,
            clipLinesForLabels ? labelClipPathData : null);
    }

    if(showLabels && !showLines) linegroup.remove();
}

export const createLines = function(lineContainer,  makeLines,  pathinfo,  isStatic) {
    const smoothing = pathinfo[0].smoothing;

    const linegroup = lineContainer.selectAll('g.contourlevel')
        .data(makeLines ? pathinfo : []);

    linegroup.exit().remove();
    linegroup.enter().append('g')
        .classed('contourlevel', true);

    if(makeLines) {
        // pedgepaths / ppaths are used by contourcarpet, for the paths transformed from a/b to x/y
        // edgepaths / paths are used by contour since it's in x/y from the start
        const opencontourlines = linegroup.selectAll('path.openline')
            .data(function(d) { return d.pedgepaths || d.edgepaths; });

        opencontourlines.exit().remove();
        opencontourlines.enter().append('path')
            .classed('openline', true);

        opencontourlines
            .attr('d', function(d) {
                return smoothopen(d, smoothing);
            })
            .style('stroke-miterlimit', 1)
            .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke');

        const closedcontourlines = linegroup.selectAll('path.closedline')
            .data(function(d) { return d.ppaths || d.paths; });

        closedcontourlines.exit().remove();
        closedcontourlines.enter().append('path')
            .classed('closedline', true);

        closedcontourlines
            .attr('d', function(d) {
                return smoothclosed(d, smoothing);
            })
            .style('stroke-miterlimit', 1)
            .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke');
    }

    return linegroup;
};

export const createLineClip = function(lineContainer,  clipLinesForLabels,  gd: GraphDiv,  uid) {
    const clips = gd._fullLayout._clips;
    const clipId = clipLinesForLabels ? ('clipline' + uid) : null;

    const lineClip = clips.selectAll('#' + clipId)
        .data(clipLinesForLabels ? [0] : []);
    lineClip.exit().remove();

    lineClip.enter().append('clipPath')
        .classed('contourlineclip', true)
        .attr('id', clipId);

    setClipUrl(lineContainer, (clipId as any), gd);

    return lineClip;
};

export const labelFormatter = function(gd: GraphDiv,  cd0) {
    const fullLayout = gd._fullLayout;
    const trace = cd0.trace;
    const contours = trace.contours;

    let formatAxis: any = {
        type: 'linear',
        _id: 'ycontour',
        showexponent: 'all',
        exponentformat: 'B'
    };

    if(contours.labelformat) {
        formatAxis.tickformat = contours.labelformat;
        setConvert(formatAxis, fullLayout);
    } else {
        const cOpts = Colorscale.extractOpts(trace);
        if(cOpts && cOpts.colorbar && cOpts.colorbar._axis) {
            formatAxis = cOpts.colorbar._axis;
        } else {
            if(contours.type === 'constraint') {
                const value = contours.value;
                if(Lib.isArrayOrTypedArray(value)) {
                    formatAxis.range = [value[0], value[value.length - 1]];
                } else formatAxis.range = [value, value];
            } else {
                formatAxis.range = [contours.start, contours.end];
                formatAxis.nticks = (contours.end - contours.start) / contours.size;
            }

            if(formatAxis.range[0] === formatAxis.range[1]) {
                formatAxis.range[1] += formatAxis.range[0] || 1;
            }
            if(!formatAxis.nticks) formatAxis.nticks = 1000;

            setConvert(formatAxis, fullLayout);
            Axes.prepTicks(formatAxis);
            formatAxis._tmin = null;
            formatAxis._tmax = null;
        }
    }

    return function(v) { return Axes.tickText(formatAxis, v).text; };
};

export const calcTextOpts = function(level,  contourFormat,  dummyText,  gd: GraphDiv) {
    const text = contourFormat(level);
    dummyText.text(text)
        .call(svgTextUtils.convertToTspans, gd);

    const el = dummyText.node();
    const bb = bBox(el, true);

    return {
        text: text,
        width: bb.width,
        height: bb.height,
        fontSize: +(el.style['font-size'].replace('px', '')),
        level: level,
        dy: (bb.top + bb.bottom) / 2
    };
};

export const findBestTextLocation = function(path,  pathBounds,  textOpts,  labelData,  plotBounds) {
    const textWidth = textOpts.width;

    let p0, dp, pMax, pMin, loc;
    if(pathBounds.isClosed) {
        dp = pathBounds.len / costConstants.INITIALSEARCHPOINTS;
        p0 = pathBounds.min + dp / 2;
        pMax = pathBounds.max;
    } else {
        dp = (pathBounds.len - textWidth) / (costConstants.INITIALSEARCHPOINTS + 1);
        p0 = pathBounds.min + dp + textWidth / 2;
        pMax = pathBounds.max - (dp + textWidth) / 2;
    }

    let cost = Infinity;
    for(let j = 0; j < costConstants.ITERATIONS; j++) {
        for(let p = p0; p < pMax; p += dp) {
            const newLocation = Lib.getTextLocation(path, pathBounds.total, p, textWidth);
            const newCost = locationCost(newLocation, textOpts, labelData, plotBounds);
            if(newCost < cost) {
                cost = newCost;
                loc = newLocation;
                pMin = p;
            }
        }
        if(cost > costConstants.MAXCOST * 2) break;

        // subsequent iterations just look half steps away from the
        // best we found in the previous iteration
        if(j) dp /= 2;
        p0 = pMin - dp / 2;
        pMax = p0 + dp * 1.5;
    }
    if(cost <= costConstants.MAXCOST) return loc;
};

/*
 * locationCost: a cost function for label locations
 * composed of three kinds of penalty:
 * - for open paths, being close to the end of the path
 * - the angle away from horizontal
 * - being too close to already placed neighbors
 */
function locationCost(loc,  textOpts,  labelData,  bounds) {
    const halfWidth = textOpts.width / 2;
    const halfHeight = textOpts.height / 2;
    const x = loc.x;
    const y = loc.y;
    const theta = loc.theta;
    const dx = Math.cos(theta) * halfWidth;
    const dy = Math.sin(theta) * halfWidth;

    // cost for being near an edge
    const normX = ((x > bounds.center) ? (bounds.right - x) : (x - bounds.left)) /
        (dx + Math.abs(Math.sin(theta) * halfHeight));
    const normY = ((y > bounds.middle) ? (bounds.bottom - y) : (y - bounds.top)) /
        (Math.abs(dy) + Math.cos(theta) * halfHeight);
    if(normX < 1 || normY < 1) return Infinity;
    let cost = costConstants.EDGECOST * (1 / (normX - 1) + 1 / (normY - 1));

    // cost for not being horizontal
    cost += costConstants.ANGLECOST * theta * theta;

    // cost for being close to other labels
    const x1 = x - dx;
    const y1 = y - dy;
    const x2 = x + dx;
    const y2 = y + dy;
    for(let i = 0; i < labelData.length; i++) {
        const labeli = labelData[i];
        const dxd = Math.cos(labeli.theta) * labeli.width / 2;
        const dyd = Math.sin(labeli.theta) * labeli.width / 2;
        const dist = Lib.segmentDistance(
            x1, y1,
            x2, y2,
            labeli.x - dxd, labeli.y - dyd,
            labeli.x + dxd, labeli.y + dyd
        ) * 2 / (textOpts.height + labeli.height);

        const sameLevel = labeli.level === textOpts.level;
        const distOffset = sameLevel ? costConstants.SAMELEVELDISTANCE : 1;

        if(dist <= distOffset) return Infinity;

        const distFactor = costConstants.NEIGHBORCOST *
            (sameLevel ? costConstants.SAMELEVELFACTOR : 1);

        cost += distFactor / (dist - distOffset);
    }

    return cost;
}

export const addLabelData = function(loc,  textOpts,  labelData,  labelClipPathData) {
    const fontSize = textOpts.fontSize;
    const w = textOpts.width + fontSize / 3;
    const h = Math.max(0, textOpts.height - fontSize / 3);

    const x = loc.x;
    const y = loc.y;
    const theta = loc.theta;

    const sin = Math.sin(theta);
    const cos = Math.cos(theta);

    const rotateXY = function(dx,  dy) {
        return [
            x + dx * cos - dy * sin,
            y + dx * sin + dy * cos
        ];
    };

    const bBoxPts = [
        rotateXY(-w / 2, -h / 2),
        rotateXY(-w / 2, h / 2),
        rotateXY(w / 2, h / 2),
        rotateXY(w / 2, -h / 2)
    ];

    labelData.push({
        text: textOpts.text,
        x: x,
        y: y,
        dy: textOpts.dy,
        theta: theta,
        level: textOpts.level,
        width: w,
        height: h
    });

    labelClipPathData.push(bBoxPts);
};

export const drawLabels = function(labelGroup,  labelData,  gd: GraphDiv,  lineClip,  labelClipPathData) {
    const labels = labelGroup.selectAll('text')
        .data(labelData, function(d) {
            return d.text + ',' + d.x + ',' + d.y + ',' + d.theta;
        });

    labels.exit().remove();

    labels.enter().append('text')
        .attr({
            'data-notex': 1,
            'text-anchor': 'middle'
        })
        .each(function(this: any, d) {
            const x = d.x + Math.sin(d.theta) * d.dy;
            const y = d.y - Math.cos(d.theta) * d.dy;
            select(this)
                .text(d.text)
                .attr({
                    x: x,
                    y: y,
                    transform: 'rotate(' + (180 * d.theta / Math.PI) + ' ' + x + ' ' + y + ')'
                })
                .call(svgTextUtils.convertToTspans, gd);
        });

    if(labelClipPathData) {
        let clipPath = '';
        for(let i = 0; i < labelClipPathData.length; i++) {
            clipPath += 'M' + labelClipPathData[i].join('L') + 'Z';
        }

        const lineClipPath = Lib.ensureSingle(lineClip, 'path', '');
        lineClipPath.attr('d', clipPath);
    }
};

function clipGaps(plotGroup,  plotinfo: PlotInfo,  gd: GraphDiv,  cd0,  perimeter) {
    const trace = cd0.trace;
    const clips = gd._fullLayout._clips;
    let clipId = 'clip' + trace.uid;

    const clipPath = clips.selectAll('#' + clipId)
        .data(trace.connectgaps ? [] : [0]);
    clipPath.enter().append('clipPath')
        .classed('contourclip', true)
        .attr('id', clipId);
    clipPath.exit().remove();

    if(trace.connectgaps === false) {
        const clipPathInfo: any = {
            // fraction of the way from missing to present point
            // to draw the boundary.
            // if you make this 1 (or 1-epsilon) then a point in
            // a sea of missing data will disappear entirely.
            level: 0.9,
            crossings: {},
            starts: [],
            edgepaths: [],
            paths: [],
            xaxis: plotinfo.xaxis,
            yaxis: plotinfo.yaxis,
            x: cd0.x,
            y: cd0.y,
            // 0 = no data, 1 = data
            z: makeClipMask(cd0),
            smoothing: 0
        };

        makeCrossings([clipPathInfo]);
        findAllPaths([clipPathInfo]);
        closeBoundaries([clipPathInfo], {type: 'levels'});

        const path = Lib.ensureSingle(clipPath, 'path', '');
        path.attr('d',
            (clipPathInfo.prefixBoundary ? 'M' + perimeter.join('L') + 'Z' : '') +
            joinAllPaths(clipPathInfo, perimeter)
        );
    } else clipId = (null as any);

    setClipUrl(plotGroup, clipId, gd);
}

function makeClipMask(cd0) {
    const empties = cd0.trace._emptypoints;
    const z: any[] = [];
    const m = cd0.z.length;
    const n = cd0.z[0].length;
    let i;
    const row: any[] = [];
    let emptyPoint;

    for(i = 0; i < n; i++) row.push(1);
    for(i = 0; i < m; i++) z.push(row.slice());
    for(i = 0; i < empties.length; i++) {
        emptyPoint = empties[i];
        z[emptyPoint[0]][emptyPoint[1]] = 0;
    }
    // save this mask to determine whether to show this data in hover
    cd0.zmask = z;
    return z;
}

export default { plot, createLines, createLineClip, labelFormatter, calcTextOpts, findBestTextLocation, addLabelData, drawLabels };
