import { select } from 'd3-selection';
import { traceIs } from '../../lib/trace_categories.js';
import { constrain, ensureSingle, isArrayOrTypedArray, mean, minExtend, nestedProperty, strTranslate } from '../../lib/index.js';
import { dashLine, fillGroupStyle, getPatternAttr, gradient, lineGroupStyle, pattern, pointStyle, textPointStyle, tryColorscale } from '../drawing/index.js';
import Color from '../color/index.js';
import _helpers from '../colorscale/helpers.js';
const { extractOpts } = _helpers;
import subTypes from '../../traces/scatter/subtypes.js';
import stylePie from '../../traces/pie/style_one.js';
import { castOption as pieCastOption } from '../../traces/pie/helpers.js';
import constants from './constants.js';
const CST_MARKER_SIZE = 12;
const CST_LINE_WIDTH = 5;
const CST_MARKER_LINE_WIDTH = 2;
const MAX_LINE_WIDTH = 10;
const MAX_MARKER_LINE_WIDTH = 5;
export default function style(s, gd, legend) {
    const fullLayout = gd._fullLayout;
    if (!legend)
        legend = fullLayout.legend;
    const constantItemSizing = legend.itemsizing === 'constant';
    const itemWidth = legend.itemwidth;
    const centerPos = (itemWidth + constants.itemGap * 2) / 2;
    const centerTransform = strTranslate(centerPos, 0);
    const boundLineWidth = (mlw, cont, max, cst) => {
        let v;
        if (mlw + 1) {
            v = mlw;
        }
        else if (cont && cont.width > 0) {
            v = cont.width;
        }
        else {
            return 0;
        }
        return constantItemSizing ? cst : Math.min(v, max);
    };
    s.each(function (d) {
        const traceGroup = select(this);
        const layers = ensureSingle(traceGroup, 'g', 'layers');
        layers.style('opacity', d[0].trace.opacity);
        const indentation = legend.indentation;
        const valign = legend.valign;
        const lineHeight = d[0].lineHeight;
        const height = d[0].height;
        if ((valign === 'middle' && indentation === 0) || !lineHeight || !height) {
            layers.attr('transform', null);
        }
        else {
            const factor = { top: 1, bottom: -1 }[valign];
            const markerOffsetY = (factor * (0.5 * (lineHeight - height + 3))) || 0;
            const markerOffsetX = legend.indentation;
            layers.attr('transform', strTranslate(markerOffsetX, markerOffsetY));
        }
        const fillJoin = layers
            .selectAll('g.legendfill')
            .data([d]);
        fillJoin.enter().append('g')
            .classed('legendfill', true);
        const lineJoin = layers
            .selectAll('g.legendlines')
            .data([d]);
        lineJoin.enter().append('g')
            .classed('legendlines', true);
        const symbolJoin = layers
            .selectAll('g.legendsymbols')
            .data([d]);
        const symbol = symbolJoin.enter().append('g')
            .classed('legendsymbols', true).merge(symbolJoin);
        const lpJoin = symbol.selectAll('g.legendpoints')
            .data([d]);
        lpJoin.enter().append('g')
            .classed('legendpoints', true);
    })
        .each(styleSpatial)
        .each(styleWaterfalls)
        .each(styleFunnels)
        .each(styleBars)
        .each(styleBoxes)
        .each(styleFunnelareas)
        .each(stylePies)
        .each(styleLines)
        .each(stylePoints)
        .each(styleCandles)
        .each(styleOHLC)
        .each(styleCustomSymbol);
    function styleCustomSymbol(d) {
        const trace = d[0].trace;
        const legendsymbol = trace.legendsymbol;
        const customPath = legendsymbol && legendsymbol.path;
        if (!customPath)
            return;
        const thisGroup = select(this);
        // Remove all default symbol elements created by prior style functions
        thisGroup.select('.legendfill').selectAll('*').remove();
        thisGroup.select('.legendlines').selectAll('*').remove();
        const ptgroup = thisGroup.select('g.legendpoints');
        ptgroup.selectAll(':not(.legendcustomsymbol)').remove();
        // Render custom SVG path
        const ptsJoin = ptgroup.selectAll('path.legendcustomsymbol')
            .data([d]);
        const ptsEnter = ptsJoin.enter().append('path')
            .classed('legendcustomsymbol', true)
            .attr('transform', centerTransform);
        ptsJoin.exit().remove();
        const fillColor = (trace.marker && trace.marker.color) ||
            (trace.line && trace.line.color) || null;
        ptsJoin.merge(ptsEnter).attr('d', customPath)
            .style('fill', fillColor)
            .style('stroke', 'none');
    }
    function styleLines(d) {
        const styleGuide = getStyleGuide(d);
        const showFill = styleGuide.showFill;
        const showLine = styleGuide.showLine;
        const showGradientLine = styleGuide.showGradientLine;
        const showGradientFill = styleGuide.showGradientFill;
        const anyFill = styleGuide.anyFill;
        const anyLine = styleGuide.anyLine;
        const d0 = d[0];
        const trace = d0.trace;
        let dMod, tMod;
        const cOpts = extractOpts(trace);
        const colorscale = cOpts.colorscale;
        const reversescale = cOpts.reversescale;
        const fillStyle = (s) => {
            if (s.size()) {
                if (showFill) {
                    fillGroupStyle(s, gd, true);
                }
                else {
                    const gradientID = 'legendfill-' + trace.uid;
                    gradient(s, gd, gradientID, getGradientDirection(reversescale), colorscale, 'fill');
                }
            }
        };
        const lineGradient = (s) => {
            if (s.size()) {
                const gradientID = 'legendline-' + trace.uid;
                lineGroupStyle(s);
                gradient(s, gd, gradientID, getGradientDirection(reversescale), colorscale, 'stroke');
            }
        };
        // with fill and no markers or text, move the line and fill up a bit
        // so it's more centered
        const pathStart = (subTypes.hasMarkers(trace) || !anyFill) ? 'M5,0' :
            // with a line leave it slightly below center, to leave room for the
            // line thickness and because the line is usually more prominent
            anyLine ? 'M5,-2' : 'M5,-3';
        const this3 = select(this);
        const fillSel = this3.select('.legendfill').selectAll('path')
            .data(showFill || showGradientFill ? [d] : []);
        const fillEnter = fillSel.enter().append('path').classed('js-fill', true);
        fillSel.exit().remove();
        fillSel.merge(fillEnter).attr('d', pathStart + 'h' + itemWidth + 'v6h-' + itemWidth + 'z')
            .call(fillStyle);
        if (showLine || showGradientLine) {
            const lw = boundLineWidth(undefined, trace.line, MAX_LINE_WIDTH, CST_LINE_WIDTH);
            tMod = minExtend(trace, { line: { width: lw } });
            dMod = [minExtend(d0, { trace: tMod })];
        }
        const lineSel = this3.select('.legendlines').selectAll('path')
            .data(showLine || showGradientLine ? [dMod] : []);
        const lineEnter = lineSel.enter().append('path').classed('js-line', true);
        lineSel.exit().remove();
        // this is ugly... but you can't apply a gradient to a perfectly
        // horizontal or vertical line. Presumably because then
        // the system doesn't know how to scale vertical variation, even
        // though there *is* no vertical variation in this case.
        // so add an invisibly small angle to the line
        // This issue (and workaround) exist across (Mac) Chrome, FF, and Safari
        lineSel.merge(lineEnter).attr('d', pathStart + (showGradientLine ? 'l' + itemWidth + ',0.0001' : 'h' + itemWidth))
            .call(showLine ? lineGroupStyle : lineGradient);
    }
    function stylePoints(d) {
        const styleGuide = getStyleGuide(d);
        const anyFill = styleGuide.anyFill;
        const anyLine = styleGuide.anyLine;
        const showLine = styleGuide.showLine;
        const showMarker = styleGuide.showMarker;
        const d0 = d[0];
        const trace = d0.trace;
        const showText = !showMarker && !anyLine && !anyFill && subTypes.hasText(trace);
        let dMod, tMod;
        // 'scatter3d' don't use gd.calcdata,
        // use d0.trace to infer arrayOk attributes
        function boundVal(attrIn, arrayToValFn, bounds, cst) {
            const valIn = nestedProperty(trace, attrIn).get();
            let valToBound = (isArrayOrTypedArray(valIn) && arrayToValFn) ?
                arrayToValFn(valIn) :
                valIn;
            if (constantItemSizing && valToBound && cst !== undefined) {
                valToBound = cst;
            }
            if (bounds) {
                if (valToBound < bounds[0])
                    return bounds[0];
                else if (valToBound > bounds[1])
                    return bounds[1];
            }
            return valToBound;
        }
        function pickFirst(array) {
            if (d0._distinct && d0.index && array[d0.index])
                return array[d0.index];
            return array[0];
        }
        // constrain text, markers, etc so they'll fit on the legend
        if (showMarker || showText || showLine) {
            const dEdit = {};
            const tEdit = {};
            if (showMarker) {
                dEdit.mc = boundVal('marker.color', pickFirst);
                dEdit.mx = boundVal('marker.symbol', pickFirst);
                dEdit.mo = boundVal('marker.opacity', mean, [0.2, 1]);
                dEdit.mlc = boundVal('marker.line.color', pickFirst);
                dEdit.mlw = boundVal('marker.line.width', mean, [0, 5], CST_MARKER_LINE_WIDTH);
                tEdit.marker = {
                    sizeref: 1,
                    sizemin: 1,
                    sizemode: 'diameter'
                };
                const ms = boundVal('marker.size', mean, [2, 16], CST_MARKER_SIZE);
                dEdit.ms = ms;
                tEdit.marker.size = ms;
            }
            if (showLine) {
                tEdit.line = {
                    width: boundVal('line.width', pickFirst, [0, 10], CST_LINE_WIDTH)
                };
            }
            if (showText) {
                dEdit.tx = 'Aa';
                dEdit.tp = boundVal('textposition', pickFirst);
                dEdit.ts = 10;
                dEdit.tc = boundVal('textfont.color', pickFirst);
                dEdit.tf = boundVal('textfont.family', pickFirst);
                dEdit.tw = boundVal('textfont.weight', pickFirst);
                dEdit.ty = boundVal('textfont.style', pickFirst);
                dEdit.tv = boundVal('textfont.variant', pickFirst);
                dEdit.tC = boundVal('textfont.textcase', pickFirst);
                dEdit.tE = boundVal('textfont.lineposition', pickFirst);
                dEdit.tS = boundVal('textfont.shadow', pickFirst);
            }
            dMod = [minExtend(d0, dEdit)];
            tMod = minExtend(trace, tEdit);
            // always show legend items in base state
            tMod.selectedpoints = null;
            // never show texttemplate
            tMod.texttemplate = null;
        }
        const ptgroup = select(this).select('g.legendpoints');
        const ptsScatter = ptgroup.selectAll('path.scatterpts')
            .data(showMarker ? dMod : []);
        // make sure marker is on the bottom, in case it enters after text
        const ptsScatterEnter = ptsScatter.enter().insert('path', ':first-child')
            .classed('scatterpts', true)
            .attr('transform', centerTransform);
        ptsScatter.exit().remove();
        ptsScatter.merge(ptsScatterEnter).call(pointStyle, tMod, gd);
        // 'mrc' is set in pointStyle and used in textPointStyle:
        // constrain it here
        if (showMarker)
            dMod[0].mrc = 3;
        const txtJoin = ptgroup.selectAll('g.pointtext')
            .data(showText ? dMod : []);
        const txtEnter = txtJoin.enter()
            .append('g').classed('pointtext', true);
        txtEnter.append('text').attr('transform', centerTransform);
        txtJoin.exit().remove();
        txtJoin.merge(txtEnter).selectAll('text').call(textPointStyle, tMod, gd);
    }
    function styleWaterfalls(d) {
        const trace = d[0].trace;
        const isWaterfall = trace.type === 'waterfall';
        if (d[0]._distinct && isWaterfall) {
            const cont = d[0].trace[d[0].dir].marker;
            d[0].mc = cont.color;
            d[0].mlw = cont.line.width;
            d[0].mlc = cont.line.color;
            return styleBarLike(d, this, 'waterfall');
        }
        let ptsData = [];
        if (trace.visible && isWaterfall) {
            ptsData = d[0].hasTotals ?
                [['increasing', 'M-6,-6V6H0Z'], ['totals', 'M6,6H0L-6,-6H-0Z'], ['decreasing', 'M6,6V-6H0Z']] :
                [['increasing', 'M-6,-6V6H6Z'], ['decreasing', 'M6,6V-6H-6Z']];
        }
        const ptsWF = select(this).select('g.legendpoints')
            .selectAll('path.legendwaterfall')
            .data(ptsData);
        const ptsWFEnter = ptsWF.enter().append('path').classed('legendwaterfall', true)
            .attr('transform', centerTransform)
            .style('stroke-miterlimit', 1);
        ptsWF.exit().remove();
        ptsWF.merge(ptsWFEnter).each(function (dd) {
            const pt = select(this);
            const cont = trace[dd[0]].marker;
            const lw = boundLineWidth(undefined, cont.line, MAX_MARKER_LINE_WIDTH, CST_MARKER_LINE_WIDTH);
            pt.attr('d', dd[1])
                .style('stroke-width', lw + 'px')
                .call(Color.fill, cont.color);
            if (lw) {
                pt.call(Color.stroke, cont.line.color);
            }
        });
    }
    function styleBars(d) {
        styleBarLike(d, this);
    }
    function styleFunnels(d) {
        styleBarLike(d, this, 'funnel');
    }
    function styleBarLike(d, lThis, desiredType) {
        const trace = d[0].trace;
        const marker = trace.marker || {};
        const markerLine = marker.line || {};
        // If bar has rounded corners, round corners of legend icon
        const pathStr = marker.cornerradius ?
            'M6,3a3,3,0,0,1-3,3H-3a3,3,0,0,1-3-3V-3a3,3,0,0,1,3-3H3a3,3,0,0,1,3,3Z' : // Square with rounded corners
            'M6,6H-6V-6H6Z'; // Normal square
        const isVisible = (!desiredType) ? traceIs(trace, 'bar') :
            (trace.visible && trace.type === desiredType);
        const barpath = select(lThis).select('g.legendpoints')
            .selectAll('path.legend' + desiredType)
            .data(isVisible ? [d] : []);
        const barpathEnter = barpath.enter().append('path').classed('legend' + desiredType, true)
            .attr('d', pathStr)
            .attr('transform', centerTransform);
        barpath.exit().remove();
        barpath.merge(barpathEnter).each(function (d) {
            const p = select(this);
            const d0 = d[0];
            const w = boundLineWidth(d0.mlw, marker.line, MAX_MARKER_LINE_WIDTH, CST_MARKER_LINE_WIDTH);
            p.style('stroke-width', w + 'px');
            let mcc = d0.mcc;
            if (!legend._inHover && 'mc' in d0) {
                // not in unified hover but
                // for legend use the color in the middle of scale
                const cOpts = extractOpts(marker);
                let mid = cOpts.mid;
                if (mid === undefined)
                    mid = (cOpts.max + cOpts.min) / 2;
                mcc = tryColorscale(marker, '')(mid);
            }
            const fillColor = mcc || d0.mc || marker.color;
            const markerPattern = marker.pattern;
            const pAttr = getPatternAttr;
            const patternShape = markerPattern && (pAttr(markerPattern.shape, 0, '') || pAttr(markerPattern.path, 0, ''));
            if (patternShape) {
                const patternBGColor = pAttr(markerPattern.bgcolor, 0, null);
                const patternFGColor = pAttr(markerPattern.fgcolor, 0, null);
                const patternFGOpacity = markerPattern.fgopacity;
                const patternSize = dimAttr(markerPattern.size, 8, 10);
                const patternSolidity = dimAttr(markerPattern.solidity, 0.5, 1);
                const patternID = 'legend-' + trace.uid;
                p.call(pattern, 'legend', gd, patternID, patternShape, patternSize, patternSolidity, mcc, markerPattern.fillmode, patternBGColor, patternFGColor, patternFGOpacity);
            }
            else {
                p.call(Color.fill, fillColor);
            }
            if (w)
                Color.stroke(p, d0.mlc || markerLine.color);
        });
    }
    function styleBoxes(d) {
        const trace = d[0].trace;
        const boxJoin = select(this).select('g.legendpoints')
            .selectAll('path.legendbox')
            .data(trace.visible && traceIs(trace, 'box-violin') ? [d] : []);
        const boxEnter = boxJoin.enter().append('path').classed('legendbox', true)
            // if we want the median bar, prepend M6,0H-6
            .attr('d', 'M6,6H-6V-6H6Z')
            .attr('transform', centerTransform);
        boxJoin.exit().remove();
        const pts = boxJoin.merge(boxEnter);
        pts.each(function () {
            const p = select(this);
            if ((trace.boxpoints === 'all' || trace.points === 'all') &&
                Color.opacity(trace.fillcolor) === 0 && Color.opacity((trace.line || {}).color) === 0) {
                const tMod = minExtend(trace, {
                    marker: {
                        size: constantItemSizing ? CST_MARKER_SIZE : constrain(trace.marker.size, 2, 16),
                        sizeref: 1,
                        sizemin: 1,
                        sizemode: 'diameter'
                    }
                });
                pts.call(pointStyle, tMod, gd);
            }
            else {
                const w = boundLineWidth(undefined, trace.line, MAX_MARKER_LINE_WIDTH, CST_MARKER_LINE_WIDTH);
                p.style('stroke-width', w + 'px')
                    .call(Color.fill, trace.fillcolor);
                if (w)
                    Color.stroke(p, trace.line.color);
            }
        });
    }
    function styleCandles(d) {
        const trace = d[0].trace;
        const candleJoin = select(this).select('g.legendpoints')
            .selectAll('path.legendcandle')
            .data(trace.visible && trace.type === 'candlestick' ? [d, d] : []);
        const candleEnter = candleJoin.enter().append('path').classed('legendcandle', true)
            .attr('d', function (_, i) {
            if (i)
                return 'M-15,0H-8M-8,6V-6H8Z'; // increasing
            return 'M15,0H8M8,-6V6H-8Z'; // decreasing
        })
            .attr('transform', centerTransform)
            .style('stroke-miterlimit', 1);
        candleJoin.exit().remove();
        candleJoin.merge(candleEnter).each(function (_, i) {
            const p = select(this);
            const cont = trace[i ? 'increasing' : 'decreasing'];
            const w = boundLineWidth(undefined, cont.line, MAX_MARKER_LINE_WIDTH, CST_MARKER_LINE_WIDTH);
            p.style('stroke-width', w + 'px')
                .call(Color.fill, cont.fillcolor);
            if (w)
                Color.stroke(p, cont.line.color);
        });
    }
    function styleOHLC(d) {
        const trace = d[0].trace;
        const ohlcJoin = select(this).select('g.legendpoints')
            .selectAll('path.legendohlc')
            .data(trace.visible && trace.type === 'ohlc' ? [d, d] : []);
        const ohlcEnter = ohlcJoin.enter().append('path').classed('legendohlc', true)
            .attr('d', function (_, i) {
            if (i)
                return 'M-15,0H0M-8,-6V0'; // increasing
            return 'M15,0H0M8,6V0'; // decreasing
        })
            .attr('transform', centerTransform)
            .style('stroke-miterlimit', 1);
        ohlcJoin.exit().remove();
        ohlcJoin.merge(ohlcEnter).each(function (_, i) {
            const p = select(this);
            const cont = trace[i ? 'increasing' : 'decreasing'];
            const w = boundLineWidth(undefined, cont.line, MAX_MARKER_LINE_WIDTH, CST_MARKER_LINE_WIDTH);
            p.style('fill', 'none')
                .call(dashLine, cont.line.dash, w);
            if (w)
                Color.stroke(p, cont.line.color);
        });
    }
    function stylePies(d) {
        stylePieLike(d, this, 'pie');
    }
    function styleFunnelareas(d) {
        stylePieLike(d, this, 'funnelarea');
    }
    function stylePieLike(d, lThis, desiredType) {
        const d0 = d[0];
        const trace = d0.trace;
        const isVisible = (!desiredType) ? traceIs(trace, desiredType) :
            (trace.visible && trace.type === desiredType);
        const pieJoin = select(lThis).select('g.legendpoints')
            .selectAll('path.legend' + desiredType)
            .data(isVisible ? [d] : []);
        const pieEnter = pieJoin.enter().append('path').classed('legend' + desiredType, true)
            .attr('d', 'M6,6H-6V-6H6Z')
            .attr('transform', centerTransform);
        pieJoin.exit().remove();
        const pts = pieJoin.merge(pieEnter);
        if (pts.size()) {
            const cont = trace.marker || {};
            const lw = boundLineWidth(pieCastOption(cont.line.width, d0.pts), cont.line, MAX_MARKER_LINE_WIDTH, CST_MARKER_LINE_WIDTH);
            const opt = 'pieLike';
            const tMod = minExtend(trace, { marker: { line: { width: lw } } }, opt);
            const d0Mod = minExtend(d0, { trace: tMod }, opt);
            stylePie(pts, d0Mod, tMod, gd);
        }
    }
    function styleSpatial(d) {
        const trace = d[0].trace;
        let useGradient;
        let ptsData = [];
        if (trace.visible) {
            switch (trace.type) {
                case 'histogram2d':
                case 'heatmap':
                    ptsData = [
                        ['M-15,-2V4H15V-2Z'] // similar to contour
                    ];
                    useGradient = true;
                    break;
                case 'choropleth':
                case 'choroplethmapbox':
                case 'choroplethmap':
                    ptsData = [
                        ['M-6,-6V6H6V-6Z']
                    ];
                    useGradient = true;
                    break;
                case 'densitymapbox':
                case 'densitymap':
                    ptsData = [
                        ['M-6,0 a6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0']
                    ];
                    useGradient = 'radial';
                    break;
                case 'cone':
                    ptsData = [
                        ['M-6,2 A2,2 0 0,0 -6,6 V6L6,4Z'],
                        ['M-6,-6 A2,2 0 0,0 -6,-2 L6,-4Z'],
                        ['M-6,-2 A2,2 0 0,0 -6,2 L6,0Z']
                    ];
                    useGradient = false;
                    break;
                case 'streamtube':
                    ptsData = [
                        ['M-6,2 A2,2 0 0,0 -6,6 H6 A2,2 0 0,1 6,2 Z'],
                        ['M-6,-6 A2,2 0 0,0 -6,-2 H6 A2,2 0 0,1 6,-6 Z'],
                        ['M-6,-2 A2,2 0 0,0 -6,2 H6 A2,2 0 0,1 6,-2 Z']
                    ];
                    useGradient = false;
                    break;
                case 'surface':
                    ptsData = [
                        ['M-6,-6 A2,3 0 0,0 -6,0 H6 A2,3 0 0,1 6,-6 Z'],
                        ['M-6,1 A2,3 0 0,1 -6,6 H6 A2,3 0 0,0 6,0 Z']
                    ];
                    useGradient = true;
                    break;
                case 'mesh3d':
                    ptsData = [
                        ['M-6,6H0L-6,-6Z'],
                        ['M6,6H0L6,-6Z'],
                        ['M-6,-6H6L0,6Z']
                    ];
                    useGradient = false;
                    break;
                case 'volume':
                    ptsData = [
                        ['M-6,6H0L-6,-6Z'],
                        ['M6,6H0L6,-6Z'],
                        ['M-6,-6H6L0,6Z']
                    ];
                    useGradient = true;
                    break;
                case 'isosurface':
                    ptsData = [
                        ['M-6,6H0L-6,-6Z'],
                        ['M6,6H0L6,-6Z'],
                        ['M-6,-6 A12,24 0 0,0 6,-6 L0,6Z']
                    ];
                    useGradient = false;
                    break;
            }
        }
        const spatialJoin = select(this).select('g.legendpoints')
            .selectAll('path.legend3dandfriends')
            .data(ptsData);
        const spatialEnter = spatialJoin.enter().append('path').classed('legend3dandfriends', true)
            .attr('transform', centerTransform)
            .style('stroke-miterlimit', 1);
        spatialJoin.exit().remove();
        spatialJoin.merge(spatialEnter).each(function (dd, i) {
            const pt = select(this);
            const cOpts = extractOpts(trace);
            const colorscale = cOpts.colorscale;
            const reversescale = cOpts.reversescale;
            const fillGradient = (s) => {
                if (s.size()) {
                    const gradientID = 'legendfill-' + trace.uid;
                    gradient(s, gd, gradientID, getGradientDirection(reversescale, useGradient === 'radial'), colorscale, 'fill');
                }
            };
            let fillColor;
            if (!colorscale) {
                const color = trace.vertexcolor || trace.facecolor || trace.color;
                fillColor = isArrayOrTypedArray(color) ? (color[i] || color[0]) : color;
            }
            else {
                if (!useGradient) {
                    const len = colorscale.length;
                    fillColor =
                        i === 0 ? colorscale[reversescale ? len - 1 : 0][1] : // minimum
                            i === 1 ? colorscale[reversescale ? 0 : len - 1][1] : // maximum
                                colorscale[Math.floor((len - 1) / 2)][1]; // middle
                }
            }
            pt.attr('d', dd[0]);
            if (fillColor) {
                pt.call(Color.fill, fillColor);
            }
            else {
                pt.call(fillGradient);
            }
        });
    }
}
function getGradientDirection(reversescale, isRadial) {
    const str = isRadial ? 'radial' : 'horizontal';
    return str + (reversescale ? '' : 'reversed');
}
function getStyleGuide(d) {
    const trace = d[0].trace;
    const contours = trace.contours;
    let showLine = subTypes.hasLines(trace);
    const showMarker = subTypes.hasMarkers(trace);
    let showFill = trace.visible && trace.fill && trace.fill !== 'none';
    let showGradientLine = false;
    let showGradientFill = false;
    if (contours) {
        const coloring = contours.coloring;
        if (coloring === 'lines') {
            showGradientLine = true;
        }
        else {
            showLine = coloring === 'none' || coloring === 'heatmap' || contours.showlines;
        }
        if (contours.type === 'constraint') {
            showFill = contours._operation !== '=';
        }
        else if (coloring === 'fill' || coloring === 'heatmap') {
            showGradientFill = true;
        }
    }
    return {
        showMarker: showMarker,
        showLine: showLine,
        showFill: showFill,
        showGradientLine: showGradientLine,
        showGradientFill: showGradientFill,
        anyLine: showLine || showGradientLine,
        anyFill: showFill || showGradientFill,
    };
}
function dimAttr(v, dflt, max) {
    if (v && isArrayOrTypedArray(v))
        return dflt;
    if (v > max)
        return max;
    return v;
}
