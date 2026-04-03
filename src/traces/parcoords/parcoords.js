import { axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { rgb } from 'd3-color';
import { pointer } from 'd3-selection';
import { drag as d3Drag } from 'd3-drag';
import Lib from '../../lib/index.js';
import { default as rgba } from 'color-rgba';
import Axes from '../../plots/cartesian/axes.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import { font } from '../../components/drawing/index.js';
import Colorscale from '../../components/colorscale/index.js';
import gup from '../../lib/gup.js';
import helpers from './helpers.js';
import c from './constants.js';
import brush from './axisbrush.js';
import lineLayerMaker from './lines.js';
const isArrayOrTypedArray = Lib.isArrayOrTypedArray;
const numberFormat = Lib.numberFormat;
const strRotate = Lib.strRotate;
const strTranslate = Lib.strTranslate;
const keyFun = gup.keyFun;
const repeat = gup.repeat;
const unwrap = gup.unwrap;
function findExtreme(fn, values, len) {
    return Lib.aggNums(fn, null, values, len);
}
function findExtremes(values, len) {
    return fixExtremes(findExtreme(Math.min, values, len), findExtreme(Math.max, values, len));
}
function dimensionExtent(dimension) {
    const range = dimension.range;
    return range ?
        fixExtremes(range[0], range[1]) :
        findExtremes(dimension.values, dimension._length);
}
function fixExtremes(lo, hi) {
    if (isNaN(lo) || !isFinite(lo)) {
        lo = 0;
    }
    if (isNaN(hi) || !isFinite(hi)) {
        hi = 0;
    }
    // avoid a degenerate (zero-width) domain
    if (lo === hi) {
        if (lo === 0) {
            // no use to multiplying zero, so add/subtract in this case
            lo -= 1;
            hi += 1;
        }
        else {
            // this keeps the range in the order of magnitude of the data
            lo *= 0.9;
            hi *= 1.1;
        }
    }
    return [lo, hi];
}
function toText(formatter, texts) {
    if (texts) {
        return function (v, i) {
            const text = texts[i];
            if (text === null || text === undefined)
                return formatter(v);
            return text;
        };
    }
    return formatter;
}
function domainScale(height, padding, dimension, tickvals, ticktext) {
    const extent = dimensionExtent(dimension);
    if (tickvals) {
        return scaleOrdinal()
            .domain(tickvals.map(toText(numberFormat(dimension.tickformat), ticktext)))
            .range(tickvals
            .map((d) => {
            const unitVal = (d - extent[0]) / (extent[1] - extent[0]);
            return (height - padding + unitVal * (2 * padding - height));
        }));
    }
    return scaleLinear()
        .domain(extent)
        .range([height - padding, padding]);
}
function unitToPaddedPx(height, padding) {
    return scaleLinear().range([padding, height - padding]);
}
function domainToPaddedUnitScale(dimension, padFraction) {
    return scaleLinear()
        .domain(dimensionExtent(dimension))
        .range([padFraction, 1 - padFraction]);
}
function ordinalScale(dimension) {
    if (!dimension.tickvals)
        return;
    const extent = dimensionExtent(dimension);
    return scaleOrdinal()
        .domain(dimension.tickvals)
        .range(dimension.tickvals.map((d) => (d - extent[0]) / (extent[1] - extent[0])));
}
function unitToColorScale(cscale) {
    const colorStops = cscale.map((d) => d[0]);
    const colorTuples = cscale.map((d) => {
        const RGBA = rgba(d[1]);
        return rgb('rgb(' + RGBA[0] + ',' + RGBA[1] + ',' + RGBA[2] + ')');
    });
    const prop = (n) => { return function (o) { return o[n]; }; };
    // We can't use d3 color interpolation as we may have non-uniform color palette raster
    // (various color stop distances).
    const polylinearUnitScales = 'rgb'.split('').map((key) => {
        return scaleLinear()
            .clamp(true)
            .domain(colorStops)
            .range(colorTuples.map(prop(key)));
    });
    return function (d) {
        return polylinearUnitScales.map((s) => s(d));
    };
}
function someFiltersActive(view) {
    return view.dimensions.some(function (p) {
        return p.brush.filterSpecified;
    });
}
function model(layout, d, i) {
    const cd0 = unwrap(d);
    const trace = cd0.trace;
    const lineColor = helpers.convertTypedArray(cd0.lineColor);
    const line = trace.line;
    const deselectedLines = {
        color: rgba(trace.unselected.line.color),
        opacity: trace.unselected.line.opacity
    };
    const cOpts = Colorscale.extractOpts(line);
    const cscale = cOpts.reversescale ? Colorscale.flipScale(cd0.cscale) : cd0.cscale;
    const domain = trace.domain;
    const dimensions = trace.dimensions;
    const width = layout.width;
    const labelAngle = trace.labelangle;
    const labelSide = trace.labelside;
    const labelFont = trace.labelfont;
    const tickFont = trace.tickfont;
    const rangeFont = trace.rangefont;
    const lines = Lib.extendDeepNoArrays({}, line, {
        color: lineColor.map(scaleLinear().domain(dimensionExtent({
            values: lineColor,
            range: [cOpts.min, cOpts.max],
            _length: trace._length
        }))),
        blockLineCount: c.blockLineCount,
        canvasOverdrag: c.overdrag * c.canvasPixelRatio
    });
    const groupWidth = Math.floor(width * (domain.x[1] - domain.x[0]));
    const groupHeight = Math.floor(layout.height * (domain.y[1] - domain.y[0]));
    const pad = layout.margin || { l: 80, r: 80, t: 100, b: 80 };
    const rowContentWidth = groupWidth;
    const rowHeight = groupHeight;
    return {
        key: i,
        colCount: dimensions.filter(helpers.isVisible).length,
        dimensions: dimensions,
        tickDistance: c.tickDistance,
        unitToColor: unitToColorScale(cscale),
        lines: lines,
        deselectedLines: deselectedLines,
        labelAngle: labelAngle,
        labelSide: labelSide,
        labelFont: labelFont,
        tickFont: tickFont,
        rangeFont: rangeFont,
        layoutWidth: width,
        layoutHeight: layout.height,
        domain: domain,
        translateX: domain.x[0] * width,
        translateY: layout.height - domain.y[1] * layout.height,
        pad: pad,
        canvasWidth: rowContentWidth * c.canvasPixelRatio + 2 * lines.canvasOverdrag,
        canvasHeight: rowHeight * c.canvasPixelRatio,
        width: rowContentWidth,
        height: rowHeight,
        canvasPixelRatio: c.canvasPixelRatio
    };
}
function viewModel(state, callbacks, model) {
    const width = model.width;
    const height = model.height;
    const dimensions = model.dimensions;
    const canvasPixelRatio = model.canvasPixelRatio;
    const xScale = (d) => { return width * d / Math.max(1, model.colCount - 1); };
    const unitPad = c.verticalPadding / height;
    const _unitToPaddedPx = unitToPaddedPx(height, c.verticalPadding);
    const vm = {
        key: model.key,
        xScale: xScale,
        model: model,
        inBrushDrag: false // consider factoring it out and putting it in a centralized global-ish gesture state object
    };
    const uniqueKeys = {};
    vm.dimensions = dimensions.filter(helpers.isVisible).map((dimension, i) => {
        const domainToPaddedUnit = domainToPaddedUnitScale(dimension, unitPad);
        const foundKey = uniqueKeys[dimension.label];
        uniqueKeys[dimension.label] = (foundKey || 0) + 1;
        const key = dimension.label + (foundKey ? '__' + foundKey : '');
        let specifiedConstraint = dimension.constraintrange;
        const filterRangeSpecified = specifiedConstraint && specifiedConstraint.length;
        if (filterRangeSpecified && !isArrayOrTypedArray(specifiedConstraint[0])) {
            specifiedConstraint = [specifiedConstraint];
        }
        const filterRange = filterRangeSpecified ?
            specifiedConstraint.map((d) => d.map(domainToPaddedUnit)) :
            [[-Infinity, Infinity]];
        const brushMove = () => {
            const p = vm;
            p.focusLayer && p.focusLayer.render(p.panels, true);
            const filtersActive = someFiltersActive(p);
            if (!state.contextShown() && filtersActive) {
                p.contextLayer && p.contextLayer.render(p.panels, true);
                state.contextShown(true);
            }
            else if (state.contextShown() && !filtersActive) {
                p.contextLayer && p.contextLayer.render(p.panels, true, true);
                state.contextShown(false);
            }
        };
        let truncatedValues = dimension.values;
        if (truncatedValues.length > dimension._length) {
            truncatedValues = truncatedValues.slice(0, dimension._length);
        }
        let tickvals = dimension.tickvals;
        let ticktext;
        function makeTickItem(v, i) { return { val: v, text: ticktext[i] }; }
        function sortTickItem(a, b) { return a.val - b.val; }
        if (isArrayOrTypedArray(tickvals) && tickvals.length) {
            if (Lib.isTypedArray(tickvals))
                tickvals = Array.from(tickvals);
            ticktext = dimension.ticktext;
            // ensure ticktext and tickvals have same length
            if (!isArrayOrTypedArray(ticktext) || !ticktext.length) {
                ticktext = tickvals.map(numberFormat(dimension.tickformat));
            }
            else if (ticktext.length > tickvals.length) {
                ticktext = ticktext.slice(0, tickvals.length);
            }
            else if (tickvals.length > ticktext.length) {
                tickvals = tickvals.slice(0, ticktext.length);
            }
            // check if we need to sort tickvals/ticktext
            for (let j = 1; j < tickvals.length; j++) {
                if (tickvals[j] < tickvals[j - 1]) {
                    const tickItems = tickvals.map(makeTickItem).sort(sortTickItem);
                    for (let k = 0; k < tickvals.length; k++) {
                        tickvals[k] = tickItems[k].val;
                        ticktext[k] = tickItems[k].text;
                    }
                    break;
                }
            }
        }
        else
            tickvals = undefined;
        truncatedValues = helpers.convertTypedArray(truncatedValues);
        return {
            key: key,
            label: dimension.label,
            tickFormat: dimension.tickformat,
            tickvals: tickvals,
            ticktext: ticktext,
            ordinal: helpers.isOrdinal(dimension),
            multiselect: dimension.multiselect,
            xIndex: i,
            crossfilterDimensionIndex: i,
            visibleIndex: dimension._index,
            height: height,
            values: truncatedValues,
            paddedUnitValues: truncatedValues.map(domainToPaddedUnit),
            unitTickvals: tickvals && tickvals.map(domainToPaddedUnit),
            xScale: xScale,
            x: xScale(i),
            canvasX: xScale(i) * canvasPixelRatio,
            unitToPaddedPx: _unitToPaddedPx,
            domainScale: domainScale(height, c.verticalPadding, dimension, tickvals, ticktext),
            ordinalScale: ordinalScale(dimension),
            parent: vm,
            model: model,
            brush: brush.makeBrush(state, filterRangeSpecified, filterRange, function () {
                state.linePickActive(false);
            }, brushMove, function (f) {
                vm.focusLayer.render(vm.panels, true);
                vm.pickLayer && vm.pickLayer.render(vm.panels, true);
                state.linePickActive(true);
                if (callbacks && callbacks.filterChanged) {
                    const invScale = domainToPaddedUnit.invert;
                    // update gd.data as if a Plotly.restyle were fired
                    const newRanges = f.map((r) => r.map(invScale).sort(Lib.sorterAsc)).sort((a, b) => a[0] - b[0]);
                    callbacks.filterChanged(vm.key, dimension._index, newRanges);
                }
            })
        };
    });
    return vm;
}
function styleExtentTexts(selection) {
    selection
        .classed(c.cn.axisExtentText, true)
        .attr('text-anchor', 'middle')
        .style('cursor', 'default');
}
function parcoordsInteractionState() {
    let linePickActive = true;
    let contextShown = false;
    return {
        linePickActive: function (val) { return arguments.length ? linePickActive = !!val : linePickActive; },
        contextShown: function (val) { return arguments.length ? contextShown = !!val : contextShown; }
    };
}
function calcTilt(angle, position) {
    const dir = (position === 'top') ? 1 : -1;
    const radians = angle * Math.PI / 180;
    const dx = Math.sin(radians);
    const dy = Math.cos(radians);
    return {
        dir: dir,
        dx: dx,
        dy: dy,
        degrees: angle
    };
}
function updatePanelLayout(yAxis, vm, plotGlPixelRatio) {
    const panels = vm.panels || (vm.panels = []);
    const data = yAxis.data();
    for (let i = 0; i < data.length - 1; i++) {
        const p = panels[i] || (panels[i] = {});
        const dim0 = data[i];
        const dim1 = data[i + 1];
        p.dim0 = dim0;
        p.dim1 = dim1;
        p.canvasX = dim0.canvasX;
        p.panelSizeX = dim1.canvasX - dim0.canvasX;
        p.panelSizeY = vm.model.canvasHeight;
        p.y = 0;
        p.canvasY = 0;
        p.plotGlPixelRatio = plotGlPixelRatio;
    }
}
function calcAllTicks(cd) {
    for (let i = 0; i < cd.length; i++) {
        for (let j = 0; j < cd[i].length; j++) {
            const trace = cd[i][j].trace;
            const dimensions = trace.dimensions;
            for (let k = 0; k < dimensions.length; k++) {
                const values = dimensions[k].values;
                const dim = dimensions[k]._ax;
                if (dim) {
                    if (!dim.range) {
                        dim.range = findExtremes(values, trace._length);
                    }
                    else {
                        dim.range = fixExtremes(dim.range[0], dim.range[1]);
                    }
                    if (!dim.dtick) {
                        dim.dtick = 0.01 * (Math.abs(dim.range[1] - dim.range[0]) || 1);
                    }
                    dim.tickformat = dimensions[k].tickformat;
                    Axes.calcTicks(dim);
                    dim.cleanRange();
                }
            }
        }
    }
}
function linearFormat(dim, v) {
    return Axes.tickText(dim._ax, v, false).text;
}
function extremeText(d, isTop) {
    if (d.ordinal)
        return '';
    const domain = d.domainScale.domain();
    const v = (domain[isTop ? domain.length - 1 : 0]);
    return linearFormat(d.model.dimensions[d.visibleIndex], v);
}
export default function parcoords(gd, cdModule, layout, callbacks) {
    const isStatic = gd._context.staticPlot;
    const fullLayout = gd._fullLayout;
    const svg = fullLayout._toppaper;
    const glContainer = fullLayout._glcontainer;
    const plotGlPixelRatio = gd._context.plotGlPixelRatio;
    const paperColor = gd._fullLayout.paper_bgcolor;
    calcAllTicks(cdModule);
    const state = parcoordsInteractionState();
    const vm = cdModule
        .filter((d) => unwrap(d).trace.visible)
        .map(model.bind(0, layout))
        .map(viewModel.bind(0, state, callbacks));
    glContainer.each(function (d, i) {
        return Lib.extendFlat(d, vm[i]);
    });
    const glLayers = glContainer.selectAll('.gl-canvas')
        .each(function (d) {
        // FIXME: figure out how to handle multiple instances
        d.viewModel = vm[0];
        d.viewModel.plotGlPixelRatio = plotGlPixelRatio;
        d.viewModel.paperColor = paperColor;
        d.model = d.viewModel ? d.viewModel.model : null;
    });
    let lastHovered = null;
    const pickLayer = glLayers.filter((d) => d.pick);
    // emit hover / unhover event
    pickLayer
        .style('pointer-events', isStatic ? 'none' : 'auto')
        .on('mousemove', function (event) {
        if (state.linePickActive() && d.lineLayer && callbacks && callbacks.hover) {
            const cw = this.width;
            const ch = this.height;
            const ptr = pointer(event, this);
            const x = ptr[0];
            const y = ptr[1];
            if (x < 0 || y < 0 || x >= cw || y >= ch) {
                return;
            }
            const pixel = d.lineLayer.readPixel(x, ch - 1 - y);
            const found = pixel[3] !== 0;
            // inverse of the calcPickColor in `lines.js`; detailed comment there
            const curveNumber = found ? pixel[2] + 256 * (pixel[1] + 256 * pixel[0]) : null;
            const eventData = {
                x: x,
                y: y,
                clientX: event.clientX,
                clientY: event.clientY,
                dataIndex: d.model.key,
                curveNumber: curveNumber
            };
            if (curveNumber !== lastHovered) { // don't unnecessarily repeat the same hit (or miss)
                if (found) {
                    callbacks.hover(eventData);
                }
                else if (callbacks.unhover) {
                    callbacks.unhover(eventData);
                }
                lastHovered = curveNumber;
            }
        }
    });
    glLayers
        .style('opacity', function (d) { return d.pick ? 0 : 1; });
    svg.style('background', 'rgba(255, 255, 255, 0)');
    const controlOverlay = svg.selectAll('.' + c.cn.parcoords)
        .data(vm, keyFun);
    controlOverlay.exit().remove();
    const controlOverlayEnter = controlOverlay.enter()
        .append('g')
        .classed(c.cn.parcoords, true)
        .style('shape-rendering', 'crispEdges')
        .style('pointer-events', 'none');
    const controlOverlayMerged = controlOverlay.merge(controlOverlayEnter);
    controlOverlayMerged.attr('transform', function (d) {
        return strTranslate(d.model.translateX, d.model.translateY);
    });
    const parcoordsControlViewJoin = controlOverlayMerged.selectAll('.' + c.cn.parcoordsControlView)
        .data(repeat, keyFun);
    const parcoordsControlView = parcoordsControlViewJoin.enter()
        .append('g')
        .classed(c.cn.parcoordsControlView, true)
        .merge(parcoordsControlViewJoin);
    parcoordsControlView.attr('transform', function (d) {
        return strTranslate(d.model.pad.l, d.model.pad.t);
    });
    const yAxisJoin = parcoordsControlView.selectAll('.' + c.cn.yAxis)
        .data(function (p) { return p.dimensions; }, keyFun);
    const yAxis = yAxisJoin.enter()
        .append('g')
        .classed(c.cn.yAxis, true)
        .merge(yAxisJoin);
    parcoordsControlView.each(function (p) {
        updatePanelLayout(yAxis, p, plotGlPixelRatio);
    });
    glLayers
        .each(function (d) {
        if (d.viewModel) {
            if (!d.lineLayer || callbacks) { // recreate in case of having callbacks e.g. restyle. Should we test for callback to be a restyle?
                d.lineLayer = lineLayerMaker(this, d);
            }
            else
                d.lineLayer.update(d);
            if (d.key || d.key === 0)
                d.viewModel[d.key] = d.lineLayer;
            const setChanged = (!d.context || // don't update background
                callbacks); // unless there is a callback on the context layer. Should we test the callback?
            d.lineLayer.render(d.viewModel.panels, setChanged);
        }
    });
    yAxis.attr('transform', function (d) {
        return strTranslate(d.xScale(d.xIndex), 0);
    });
    // drag column for reordering columns
    yAxis.call(d3Drag()
        .origin(function (d) { return d; })
        .on('drag', function (event) {
        const p = d.parent;
        state.linePickActive(false);
        d.x = Math.max(-c.overdrag, Math.min(d.model.width + c.overdrag, event.x));
        d.canvasX = d.x * d.model.canvasPixelRatio;
        yAxis
            .sort((a, b) => a.x - b.x)
            .each(function (e, i) {
            e.xIndex = i;
            e.x = d === e ? e.x : e.xScale(e.xIndex);
            e.canvasX = e.x * e.model.canvasPixelRatio;
        });
        updatePanelLayout(yAxis, p, plotGlPixelRatio);
        yAxis.filter((e) => Math.abs(d.xIndex - e.xIndex) !== 0)
            .attr('transform', function (d) { return strTranslate(d.xScale(d.xIndex), 0); });
        select(this).attr('transform', strTranslate(d.x, 0));
        yAxis.each(function (e, i0, i1) { if (i1 === d.parent.key)
            p.dimensions[i0] = e; });
        p.contextLayer && p.contextLayer.render(p.panels, false, !someFiltersActive(p));
        p.focusLayer.render && p.focusLayer.render(p.panels);
    })
        .on('end', function (event) {
        const p = d.parent;
        d.x = d.xScale(d.xIndex);
        d.canvasX = d.x * d.model.canvasPixelRatio;
        updatePanelLayout(yAxis, p, plotGlPixelRatio);
        select(this)
            .attr('transform', function (d) { return strTranslate(d.x, 0); });
        p.contextLayer && p.contextLayer.render(p.panels, false, !someFiltersActive(p));
        p.focusLayer && p.focusLayer.render(p.panels);
        p.pickLayer && p.pickLayer.render(p.panels, true);
        state.linePickActive(true);
        if (callbacks && callbacks.axesMoved) {
            callbacks.axesMoved(p.key, p.dimensions.map((e) => e.crossfilterDimensionIndex));
        }
    }));
    yAxis.exit()
        .remove();
    const axisOverlaysJoin = yAxis.selectAll('.' + c.cn.axisOverlays)
        .data(repeat, keyFun);
    const axisOverlays = axisOverlaysJoin.enter()
        .append('g')
        .classed(c.cn.axisOverlays, true)
        .merge(axisOverlaysJoin);
    axisOverlays.selectAll('.' + c.cn.axis).remove();
    const axisJoin = axisOverlays.selectAll('.' + c.cn.axis)
        .data(repeat, keyFun);
    const axis = axisJoin.enter()
        .append('g')
        .classed(c.cn.axis, true)
        .merge(axisJoin);
    axis
        .each(function (d) {
        const wantedTickCount = d.model.height / d.model.tickDistance;
        const scale = d.domainScale;
        const sdom = scale.domain();
        select(this)
            .call(axisLeft()
            .tickSize(4)
            .outerTickSize(2)
            .ticks(wantedTickCount, d.tickFormat) // works for continuous scales only...
            .tickValues(d.ordinal ? // and this works for ordinal scales
            sdom :
            null)
            .tickFormat(function (v) {
            return helpers.isOrdinal(d) ? v : linearFormat(d.model.dimensions[d.visibleIndex], v);
        })
            .scale(scale));
        font(axis.selectAll('text'), d.model.tickFont);
    });
    axis.selectAll('.domain, .tick>line')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-opacity', 0.25)
        .attr('stroke-width', '1px');
    axis.selectAll('text')
        .style('cursor', 'default');
    const axisHeadingJoin = axisOverlays.selectAll('.' + c.cn.axisHeading)
        .data(repeat, keyFun);
    const axisHeading = axisHeadingJoin.enter()
        .append('g')
        .classed(c.cn.axisHeading, true)
        .merge(axisHeadingJoin);
    const axisTitleJoin = axisHeading.selectAll('.' + c.cn.axisTitle)
        .data(repeat, keyFun);
    const axisTitle = axisTitleJoin.enter()
        .append('text')
        .classed(c.cn.axisTitle, true)
        .attr('text-anchor', 'middle')
        .style('cursor', 'ew-resize')
        .style('pointer-events', isStatic ? 'none' : 'auto')
        .merge(axisTitleJoin);
    axisTitle
        .text(function (d) { return d.label; })
        .each(function (d) {
        const e = select(this);
        font(e, d.model.labelFont);
        svgTextUtils.convertToTspans(e, gd);
    })
        .attr('transform', function (d) {
        const tilt = calcTilt(d.model.labelAngle, d.model.labelSide);
        const r = c.axisTitleOffset;
        return ((tilt.dir > 0 ? '' : strTranslate(0, 2 * r + d.model.height)) +
            strRotate(tilt.degrees) +
            strTranslate(-r * tilt.dx, -r * tilt.dy));
    })
        .attr('text-anchor', function (d) {
        const tilt = calcTilt(d.model.labelAngle, d.model.labelSide);
        const adx = Math.abs(tilt.dx);
        const ady = Math.abs(tilt.dy);
        if (2 * adx > ady) {
            return (tilt.dir * tilt.dx < 0) ? 'start' : 'end';
        }
        else {
            return 'middle';
        }
    });
    const axisExtentJoin = axisOverlays.selectAll('.' + c.cn.axisExtent)
        .data(repeat, keyFun);
    const axisExtent = axisExtentJoin.enter()
        .append('g')
        .classed(c.cn.axisExtent, true)
        .merge(axisExtentJoin);
    const axisExtentTopJoin = axisExtent.selectAll('.' + c.cn.axisExtentTop)
        .data(repeat, keyFun);
    const axisExtentTop = axisExtentTopJoin.enter()
        .append('g')
        .classed(c.cn.axisExtentTop, true)
        .merge(axisExtentTopJoin);
    axisExtentTop
        .attr('transform', strTranslate(0, -c.axisExtentOffset));
    const axisExtentTopTextJoin = axisExtentTop.selectAll('.' + c.cn.axisExtentTopText)
        .data(repeat, keyFun);
    const axisExtentTopText = axisExtentTopTextJoin.enter()
        .append('text')
        .classed(c.cn.axisExtentTopText, true)
        .call(styleExtentTexts)
        .merge(axisExtentTopTextJoin);
    axisExtentTopText
        .text(function (d) { return extremeText(d, true); })
        .each(function (d) { font(select(this), d.model.rangeFont); });
    const axisExtentBottomJoin = axisExtent.selectAll('.' + c.cn.axisExtentBottom)
        .data(repeat, keyFun);
    const axisExtentBottom = axisExtentBottomJoin.enter()
        .append('g')
        .classed(c.cn.axisExtentBottom, true)
        .merge(axisExtentBottomJoin);
    axisExtentBottom
        .attr('transform', function (d) {
        return strTranslate(0, d.model.height + c.axisExtentOffset);
    });
    const axisExtentBottomTextJoin = axisExtentBottom.selectAll('.' + c.cn.axisExtentBottomText)
        .data(repeat, keyFun);
    const axisExtentBottomText = axisExtentBottomTextJoin.enter()
        .append('text')
        .classed(c.cn.axisExtentBottomText, true)
        .attr('dy', '0.75em')
        .call(styleExtentTexts)
        .merge(axisExtentBottomTextJoin);
    axisExtentBottomText
        .text(function (d) { return extremeText(d, false); })
        .each(function (d) { font(select(this), d.model.rangeFont); });
    brush.ensureAxisBrush(axisOverlays, paperColor, gd);
}
