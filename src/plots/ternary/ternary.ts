import { select } from 'd3-selection';
import tinycolor from 'tinycolor2';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import { hideOutsideRangePoints, setClipUrl } from '../../components/drawing/index.js';
import setConvert from '../cartesian/set_convert.js';
import { extendFlat } from '../../lib/extend.js';
import Plots from '../plots.js';
import Axes from '../cartesian/axes.js';
import dragElement from '../../components/dragelement/index.js';
import Fx from '../../components/fx/index.js';
import dragHelpers from '../../components/dragelement/helpers.js';
import Titles from '../../components/titles/index.js';
import _index from '../../components/selections/index.js';
const { prepSelect, selectOnClick, clearOutline, clearSelectionsCache } = _index;
import constants from '../cartesian/constants.js';
import type { FullLayout } from '../../../types/core';
const strTranslate = Lib.strTranslate;
const _ = Lib._;
const freeMode = dragHelpers.freeMode;
const rectMode = dragHelpers.rectMode;

function Ternary(this: any, options: any, fullLayout: FullLayout) {
    this.id = options.id;
    this.graphDiv = options.graphDiv;
    this.init(fullLayout);
    this.makeFramework(fullLayout);
    this.updateFx(fullLayout);

    // unfortunately, we have to keep track of some axis tick settings
    // as ternary subplots do not implement the 'ticks' editType
    this.aTickLayout = null;
    this.bTickLayout = null;
    this.cTickLayout = null;
}

export default Ternary;

const proto = Ternary.prototype;

proto.init = function(fullLayout: any) {
    this.container = fullLayout._ternarylayer;
    this.defs = fullLayout._defs;
    this.layoutId = fullLayout._uid;
    this.traceHash = {};
    this.layers = {};
};

proto.plot = function(ternaryCalcData: any, fullLayout: any) {
    const _this = this;
    const ternaryLayout = fullLayout[_this.id];
    const graphSize = fullLayout._size;

    _this._hasClipOnAxisFalse = false;
    for(let i = 0; i < ternaryCalcData.length; i++) {
        const trace = ternaryCalcData[i][0].trace;

        if(trace.cliponaxis === false) {
            _this._hasClipOnAxisFalse = true;
            break;
        }
    }

    _this.updateLayers(ternaryLayout);
    _this.adjustLayout(ternaryLayout, graphSize);
    Plots.generalUpdatePerTraceModule(_this.graphDiv, _this, ternaryCalcData, ternaryLayout);
    _this.layers.plotbg.select('path').call(Color.fill, ternaryLayout.bgcolor);
};

proto.makeFramework = function(fullLayout: any) {
    const _this = this;
    const gd = _this.graphDiv;
    const ternaryLayout = fullLayout[_this.id];

    const clipId = _this.clipId = 'clip' + _this.layoutId + _this.id;
    const clipIdRelative = _this.clipIdRelative = 'clip-relative' + _this.layoutId + _this.id;

    // clippath for this ternary subplot
    _this.clipDef = Lib.ensureSingleById(fullLayout._clips, 'clipPath', clipId, function(s: any) {
        s.append('path').attr('d', 'M0,0Z');
    });

    // 'relative' clippath (i.e. no translation) for this ternary subplot
    _this.clipDefRelative = Lib.ensureSingleById(fullLayout._clips, 'clipPath', clipIdRelative, function(s: any) {
        s.append('path').attr('d', 'M0,0Z');
    });

    // container for everything in this ternary subplot
    _this.plotContainer = Lib.ensureSingle(_this.container, 'g', _this.id);
    _this.updateLayers(ternaryLayout);

    setClipUrl(_this.layers.backplot, clipId, gd);
    setClipUrl(_this.layers.grids, clipId, gd);
};

proto.updateFx = function(fullLayout: any) {
    fullLayout._ternarylayer
        .selectAll('g.toplevel')
        .style('cursor', fullLayout.dragmode === 'pan' ? 'move' : 'crosshair');
};

proto.updateLayers = function(ternaryLayout: any) {
    const _this = this;
    const layers = _this.layers;

    // inside that container, we have one container for the data, and
    // one each for the three axes around it.

    const plotLayers = ['draglayer', 'plotbg', 'backplot', 'grids'];

    if(ternaryLayout.aaxis.layer === 'below traces') {
        plotLayers.push('aaxis', 'aline');
    }
    if(ternaryLayout.baxis.layer === 'below traces') {
        plotLayers.push('baxis', 'bline');
    }
    if(ternaryLayout.caxis.layer === 'below traces') {
        plotLayers.push('caxis', 'cline');
    }

    plotLayers.push('frontplot');

    if(ternaryLayout.aaxis.layer === 'above traces') {
        plotLayers.push('aaxis', 'aline');
    }
    if(ternaryLayout.baxis.layer === 'above traces') {
        plotLayers.push('baxis', 'bline');
    }
    if(ternaryLayout.caxis.layer === 'above traces') {
        plotLayers.push('caxis', 'cline');
    }

    const toplevel = _this.plotContainer.selectAll('g.toplevel')
        .data(plotLayers, String);

    const grids = ['agrid', 'bgrid', 'cgrid'];

    toplevel.enter().append('g')
        .attr('class', function(d: any) { return 'toplevel ' + d; })
        .each(function(this: any, d: any) {
            const s = select(this);
            layers[d] = s;

            // containers for different trace types.
            // NOTE - this is different from cartesian, where all traces
            // are in front of grids. Here I'm putting maps behind the grids
            // so the grids will always be visible if they're requested.
            // Perhaps we want that for cartesian too?
            if(d === 'frontplot') {
                s.append('g').classed('scatterlayer', true);
            } else if(d === 'backplot') {
                s.append('g').classed('maplayer', true);
            } else if(d === 'plotbg') {
                s.append('path').attr('d', 'M0,0Z');
            } else if(d === 'aline' || d === 'bline' || d === 'cline') {
                s.append('path');
            } else if(d === 'grids') {
                grids.forEach(function(d) {
                    layers[d] = s.append('g').classed('grid ' + d, true);
                });
            }
        });

    toplevel.order();
};

const whRatio = Math.sqrt(4 / 3);

proto.adjustLayout = function(ternaryLayout: any, graphSize: any) {
    const _this = this;
    const domain = ternaryLayout.domain;
    const xDomainCenter = (domain.x[0] + domain.x[1]) / 2;
    const yDomainCenter = (domain.y[0] + domain.y[1]) / 2;
    const xDomain = domain.x[1] - domain.x[0];
    const yDomain = domain.y[1] - domain.y[0];
    const wmax = xDomain * graphSize.w;
    const hmax = yDomain * graphSize.h;
    const sum = ternaryLayout.sum;
    const amin = ternaryLayout.aaxis.min;
    const bmin = ternaryLayout.baxis.min;
    const cmin = ternaryLayout.caxis.min;

    let x0, y0, w, h, xDomainFinal, yDomainFinal;

    if(wmax > whRatio * hmax) {
        h = hmax;
        w = h * whRatio;
    } else {
        w = wmax;
        h = w / whRatio;
    }

    xDomainFinal = xDomain * w / wmax;
    yDomainFinal = yDomain * h / hmax;

    x0 = graphSize.l + graphSize.w * xDomainCenter - w / 2;
    y0 = graphSize.t + graphSize.h * (1 - yDomainCenter) - h / 2;

    _this.x0 = x0;
    _this.y0 = y0;
    _this.w = w;
    _this.h = h;
    _this.sum = sum;

    // set up the x and y axis objects we'll use to lay out the points
    _this.xaxis = {
        type: 'linear',
        range: [amin + 2 * cmin - sum, sum - amin - 2 * bmin],
        domain: [
            xDomainCenter - xDomainFinal / 2,
            xDomainCenter + xDomainFinal / 2
        ],
        _id: 'x'
    };
    setConvert(_this.xaxis, _this.graphDiv._fullLayout);
    _this.xaxis.setScale();
    _this.xaxis.isPtWithinRange = function(d: any) {
        return (
            d.a >= _this.aaxis.range[0] &&
            d.a <= _this.aaxis.range[1] &&
            d.b >= _this.baxis.range[1] &&
            d.b <= _this.baxis.range[0] &&
            d.c >= _this.caxis.range[1] &&
            d.c <= _this.caxis.range[0]
        );
    };

    _this.yaxis = {
        type: 'linear',
        range: [amin, sum - bmin - cmin],
        domain: [
            yDomainCenter - yDomainFinal / 2,
            yDomainCenter + yDomainFinal / 2
        ],
        _id: 'y'
    };
    setConvert(_this.yaxis, _this.graphDiv._fullLayout);
    _this.yaxis.setScale();
    _this.yaxis.isPtWithinRange = function() { return true; };

    // set up the modified axes for tick drawing
    const yDomain0 = _this.yaxis.domain[0];

    // aaxis goes up the left side. Set it up as a y axis, but with
    // fictitious angles and domain, but then rotate and translate
    // it into place at the end
    const aaxis = _this.aaxis = extendFlat({}, ternaryLayout.aaxis, {
        range: [amin, sum - bmin - cmin],
        side: 'left',
        // tickangle = 'auto' means 0 anyway for a y axis, need to coerce to 0 here
        // so we can shift by 30.
        tickangle: (+ternaryLayout.aaxis.tickangle || 0) - 30,
        domain: [yDomain0, yDomain0 + yDomainFinal * whRatio],
        anchor: 'free',
        position: 0,
        _id: 'y',
        _length: w
    });
    setConvert(aaxis, _this.graphDiv._fullLayout);
    aaxis.setScale();

    // baxis goes across the bottom (backward). We can set it up as an x axis
    // without any enclosing transformation.
    const baxis = _this.baxis = extendFlat({}, ternaryLayout.baxis, {
        range: [sum - amin - cmin, bmin],
        side: 'bottom',
        domain: _this.xaxis.domain,
        anchor: 'free',
        position: 0,
        _id: 'x',
        _length: w
    });
    setConvert(baxis, _this.graphDiv._fullLayout);
    baxis.setScale();

    // caxis goes down the right side. Set it up as a y axis, with
    // post-transformation similar to aaxis
    const caxis = _this.caxis = extendFlat({}, ternaryLayout.caxis, {
        range: [sum - amin - bmin, cmin],
        side: 'right',
        tickangle: (+ternaryLayout.caxis.tickangle || 0) + 30,
        domain: [yDomain0, yDomain0 + yDomainFinal * whRatio],
        anchor: 'free',
        position: 0,
        _id: 'y',
        _length: w
    });
    setConvert(caxis, _this.graphDiv._fullLayout);
    caxis.setScale();

    const triangleClip = 'M' + x0 + ',' + (y0 + h) + 'h' + w + 'l-' + (w / 2) + ',-' + h + 'Z';
    _this.clipDef.select('path').attr('d', triangleClip);
    _this.layers.plotbg.select('path').attr('d', triangleClip);

    const triangleClipRelative = 'M0,' + h + 'h' + w + 'l-' + (w / 2) + ',-' + h + 'Z';
    _this.clipDefRelative.select('path').attr('d', triangleClipRelative);

    const plotTransform = strTranslate(x0, y0);
    _this.plotContainer.selectAll('.scatterlayer,.maplayer')
        .attr('transform', plotTransform);

    _this.clipDefRelative.select('path').attr('transform', null);

    // TODO: shift axes to accommodate linewidth*sin(30) tick mark angle

    // TODO: there's probably an easier way to handle these translations/offsets now...
    const bTransform = strTranslate(x0 - baxis._offset, y0 + h);

    _this.layers.baxis.attr('transform', bTransform);
    _this.layers.bgrid.attr('transform', bTransform);

    const aTransform = strTranslate(x0 + w / 2, y0) +
        'rotate(30)' + strTranslate(0, -aaxis._offset);
    _this.layers.aaxis.attr('transform', aTransform);
    _this.layers.agrid.attr('transform', aTransform);

    const cTransform = strTranslate(x0 + w / 2, y0) +
        'rotate(-30)' + strTranslate(0, -caxis._offset);
    _this.layers.caxis.attr('transform', cTransform);
    _this.layers.cgrid.attr('transform', cTransform);

    _this.drawAxes(true);

    _this.layers.aline.select('path')
        .attr('d', aaxis.showline ?
            'M' + x0 + ',' + (y0 + h) + 'l' + (w / 2) + ',-' + h : 'M0,0')
        .call(Color.stroke, aaxis.linecolor || '#000')
        .style('stroke-width', (aaxis.linewidth || 0) + 'px');
    _this.layers.bline.select('path')
        .attr('d', baxis.showline ?
            'M' + x0 + ',' + (y0 + h) + 'h' + w : 'M0,0')
        .call(Color.stroke, baxis.linecolor || '#000')
        .style('stroke-width', (baxis.linewidth || 0) + 'px');
    _this.layers.cline.select('path')
        .attr('d', caxis.showline ?
            'M' + (x0 + w / 2) + ',' + y0 + 'l' + (w / 2) + ',' + h : 'M0,0')
        .call(Color.stroke, caxis.linecolor || '#000')
        .style('stroke-width', (caxis.linewidth || 0) + 'px');

    if(!_this.graphDiv._context.staticPlot) {
        _this.initInteractions();
    }

    setClipUrl(
        _this.layers.frontplot,
        _this._hasClipOnAxisFalse ? null : _this.clipId,
        _this.graphDiv
    );
};

proto.drawAxes = function(doTitles: any) {
    const _this = this;
    const gd = _this.graphDiv;
    const titlesuffix = _this.id.slice(7) + 'title';
    const layers = _this.layers;
    const aaxis = _this.aaxis;
    const baxis = _this.baxis;
    const caxis = _this.caxis;

    _this.drawAx(aaxis);
    _this.drawAx(baxis);
    _this.drawAx(caxis);

    if(doTitles) {
        const apad = Math.max(aaxis.showticklabels ? aaxis.tickfont.size / 2 : 0,
            (caxis.showticklabels ? caxis.tickfont.size * 0.75 : 0) +
            (caxis.ticks === 'outside' ? caxis.ticklen * 0.87 : 0));
        const bpad = (baxis.showticklabels ? baxis.tickfont.size : 0) +
            (baxis.ticks === 'outside' ? baxis.ticklen : 0) + 3;

        layers['a-title'] = Titles.draw(gd, 'a' + titlesuffix, {
            propContainer: aaxis,
            propName: _this.id + '.aaxis.title.text',
            placeholder: _(gd, 'Click to enter Component A title'),
            attributes: {
                x: _this.x0 + _this.w / 2,
                y: _this.y0 - aaxis.title.font.size / 3 - apad,
                'text-anchor': 'middle'
            }
        });
        layers['b-title'] = Titles.draw(gd, 'b' + titlesuffix, {
            propContainer: baxis,
            propName: _this.id + '.baxis.title.text',
            placeholder: _(gd, 'Click to enter Component B title'),
            attributes: {
                x: _this.x0 - bpad,
                y: _this.y0 + _this.h + baxis.title.font.size * 0.83 + bpad,
                'text-anchor': 'middle'
            }
        });
        layers['c-title'] = Titles.draw(gd, 'c' + titlesuffix, {
            propContainer: caxis,
            propName: _this.id + '.caxis.title.text',
            placeholder: _(gd, 'Click to enter Component C title'),
            attributes: {
                x: _this.x0 + _this.w + bpad,
                y: _this.y0 + _this.h + caxis.title.font.size * 0.83 + bpad,
                'text-anchor': 'middle'
            }
        });
    }
};

proto.drawAx = function(ax: any) {
    const _this = this;
    const gd = _this.graphDiv;
    const axName = ax._name;
    const axLetter = axName.charAt(0);
    const axId = ax._id;
    const axLayer = _this.layers[axName];
    const counterAngle = 30;

    const stashKey = axLetter + 'tickLayout';
    const newTickLayout = strTickLayout(ax);
    if(_this[stashKey] !== newTickLayout) {
        axLayer.selectAll('.' + axId + 'tick').remove();
        _this[stashKey] = newTickLayout;
    }

    ax.setScale();

    const vals = Axes.calcTicks(ax);
    const valsClipped = Axes.clipEnds(ax, vals);
    const transFn = Axes.makeTransTickFn(ax);
    const tickSign = Axes.getTickSigns(ax)[2];

    const caRad = Lib.deg2rad(counterAngle);
    const pad = tickSign * (ax.linewidth || 1) / 2;
    const len = tickSign * ax.ticklen;
    const w = _this.w;
    const h = _this.h;

    const tickPath = axLetter === 'b' ?
        'M0,' + pad + 'l' + (Math.sin(caRad) * len) + ',' + (Math.cos(caRad) * len) :
        'M' + pad + ',0l' + (Math.cos(caRad) * len) + ',' + (-Math.sin(caRad) * len);

    const gridPath = ({
        a: 'M0,0l' + h + ',-' + (w / 2),
        b: 'M0,0l-' + (w / 2) + ',-' + h,
        c: 'M0,0l-' + h + ',' + (w / 2)
    } as any)[axLetter];

    Axes.drawTicks(gd, ax, {
        vals: ax.ticks === 'inside' ? valsClipped : vals,
        layer: axLayer,
        path: tickPath,
        transFn: transFn,
        crisp: false
    });

    Axes.drawGrid(gd, ax, {
        vals: valsClipped,
        layer: _this.layers[axLetter + 'grid'],
        path: gridPath,
        transFn: transFn,
        crisp: false
    });

    Axes.drawLabels(gd, ax, {
        vals: vals,
        layer: axLayer,
        transFn: transFn,
        labelFns: Axes.makeLabelFns(ax, 0, counterAngle)
    });
};

function strTickLayout(axLayout: any) {
    return axLayout.ticks + String(axLayout.ticklen) + String(axLayout.showticklabels);
}

// hard coded paths for zoom corners
// uses the same sizing as cartesian, length is MINZOOM/2, width is 3px
const CLEN = constants.MINZOOM / 2 + 0.87;
const BLPATH = 'm-0.87,.5h' + CLEN + 'v3h-' + (CLEN + 5.2) +
    'l' + (CLEN / 2 + 2.6) + ',-' + (CLEN * 0.87 + 4.5) +
    'l2.6,1.5l-' + (CLEN / 2) + ',' + (CLEN * 0.87) + 'Z';
const BRPATH = 'm0.87,.5h-' + CLEN + 'v3h' + (CLEN + 5.2) +
    'l-' + (CLEN / 2 + 2.6) + ',-' + (CLEN * 0.87 + 4.5) +
    'l-2.6,1.5l' + (CLEN / 2) + ',' + (CLEN * 0.87) + 'Z';
const TOPPATH = 'm0,1l' + (CLEN / 2) + ',' + (CLEN * 0.87) +
    'l2.6,-1.5l-' + (CLEN / 2 + 2.6) + ',-' + (CLEN * 0.87 + 4.5) +
    'l-' + (CLEN / 2 + 2.6) + ',' + (CLEN * 0.87 + 4.5) +
    'l2.6,1.5l' + (CLEN / 2) + ',-' + (CLEN * 0.87) + 'Z';
const STARTMARKER = 'm0.5,0.5h5v-2h-5v-5h-2v5h-5v2h5v5h2Z';

// I guess this could be shared with cartesian... but for now it's separate.
let SHOWZOOMOUTTIP = true;

proto.clearOutline = function() {
    clearSelectionsCache(this.dragOptions);
    clearOutline(this.dragOptions.gd);
};

proto.initInteractions = function() {
    const _this = this;
    const dragger = _this.layers.plotbg.select('path').node();
    const gd = _this.graphDiv;
    const zoomLayer = gd._fullLayout._zoomlayer;
    let scaleX: any;
    let scaleY: any;

    // use plotbg for the main interactions
    this.dragOptions = {
        element: dragger,
        gd: gd,
        plotinfo: {
            id: _this.id,
            domain: gd._fullLayout[_this.id].domain,
            xaxis: _this.xaxis,
            yaxis: _this.yaxis
        },
        subplot: _this.id,
        prepFn: function(e: any, startX: any, startY: any) {
            // these aren't available yet when initInteractions
            // is called
            _this.dragOptions.xaxes = [_this.xaxis];
            _this.dragOptions.yaxes = [_this.yaxis];

            scaleX = gd._fullLayout._invScaleX;
            scaleY = gd._fullLayout._invScaleY;

            const dragModeNow = _this.dragOptions.dragmode = gd._fullLayout.dragmode;

            if(freeMode(dragModeNow)) _this.dragOptions.minDrag = 1;
            else _this.dragOptions.minDrag = undefined;

            if(dragModeNow === 'zoom') {
                _this.dragOptions.moveFn = zoomMove;
                _this.dragOptions.clickFn = clickZoomPan;
                _this.dragOptions.doneFn = zoomDone;
                zoomPrep(e, startX, startY);
            } else if(dragModeNow === 'pan') {
                _this.dragOptions.moveFn = plotDrag;
                _this.dragOptions.clickFn = clickZoomPan;
                _this.dragOptions.doneFn = dragDone;
                panPrep();
                _this.clearOutline(gd);
            } else if(rectMode(dragModeNow) || freeMode(dragModeNow)) {
                prepSelect(e, startX, startY, _this.dragOptions, dragModeNow);
            }
        }
    };

    let x0: any, y0: any, mins0: any, span0: any, mins: any, lum: any, path0: any, dimmed: any, zb: any, corners: any;

    function makeUpdate(_mins: any) {
        const attrs: any = {};
        attrs[_this.id + '.aaxis.min'] = _mins.a;
        attrs[_this.id + '.baxis.min'] = _mins.b;
        attrs[_this.id + '.caxis.min'] = _mins.c;
        return attrs;
    }

    function clickZoomPan(numClicks: any, evt: any) {
        const clickMode = gd._fullLayout.clickmode;

        removeZoombox(gd);

        if(numClicks === 2) {
            gd.emit('plotly_doubleclick', null);
            Registry.call('_guiRelayout', gd, makeUpdate({a: 0, b: 0, c: 0}));
        }

        if(clickMode.indexOf('select') > -1 && numClicks === 1) {
            selectOnClick(evt, gd, [_this.xaxis], [_this.yaxis], _this.id, _this.dragOptions);
        }

        if(clickMode.indexOf('event') > -1) {
            Fx.click(gd, evt, _this.id);
        }
    }

    function zoomPrep(e: any, startX: any, startY: any) {
        const dragBBox = dragger.getBoundingClientRect();
        x0 = startX - dragBBox.left;
        y0 = startY - dragBBox.top;

        gd._fullLayout._calcInverseTransform(gd);
        const inverse = gd._fullLayout._invTransform;
        const transformedCoords = Lib.apply3DTransform(inverse)(x0, y0);
        x0 = transformedCoords[0];
        y0 = transformedCoords[1];

        mins0 = {
            a: _this.aaxis.range[0],
            b: _this.baxis.range[1],
            c: _this.caxis.range[1]
        };
        mins = mins0;
        span0 = _this.aaxis.range[1] - mins0.a;
        lum = tinycolor(_this.graphDiv._fullLayout[_this.id].bgcolor).getLuminance();
        path0 = 'M0,' + _this.h + 'L' + (_this.w / 2) + ', 0L' + _this.w + ',' + _this.h + 'Z';
        dimmed = false;

        zb = zoomLayer.append('path')
            .attr('class', 'zoombox')
            .attr('transform', strTranslate(_this.x0, _this.y0))
            .style('fill', lum > 0.2 ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)')
            .style('stroke-width', 0)
            .attr('d', path0);

        corners = zoomLayer.append('path')
            .attr('class', 'zoombox-corners')
            .attr('transform', strTranslate(_this.x0, _this.y0))
            .style('fill', Color.background)
            .style('stroke', Color.defaultLine)
            .style('stroke-width', 1)
            .style('opacity', 0)
            .attr('d', 'M0,0Z');

        _this.clearOutline(gd);
    }

    function getAFrac(x: any, y: any) { return 1 - (y / _this.h); }
    function getBFrac(x: any, y: any) { return 1 - ((x + (_this.h - y) / Math.sqrt(3)) / _this.w); }
    function getCFrac(x: any, y: any) { return ((x - (_this.h - y) / Math.sqrt(3)) / _this.w); }

    function zoomMove(dx0: any, dy0: any) {
        const x1 = x0 + dx0 * scaleX;
        const y1 = y0 + dy0 * scaleY;
        const afrac = Math.max(0, Math.min(1, getAFrac(x0, y0), getAFrac(x1, y1)));
        const bfrac = Math.max(0, Math.min(1, getBFrac(x0, y0), getBFrac(x1, y1)));
        const cfrac = Math.max(0, Math.min(1, getCFrac(x0, y0), getCFrac(x1, y1)));
        const xLeft = ((afrac / 2) + cfrac) * _this.w;
        const xRight = (1 - (afrac / 2) - bfrac) * _this.w;
        const xCenter = (xLeft + xRight) / 2;
        const xSpan = xRight - xLeft;
        const yBottom = (1 - afrac) * _this.h;
        const yTop = yBottom - xSpan / whRatio;

        if(xSpan < constants.MINZOOM) {
            mins = mins0;
            zb.attr('d', path0);
            corners.attr('d', 'M0,0Z');
        } else {
            mins = {
                a: mins0.a + afrac * span0,
                b: mins0.b + bfrac * span0,
                c: mins0.c + cfrac * span0
            };
            zb.attr('d', path0 + 'M' + xLeft + ',' + yBottom +
                'H' + xRight + 'L' + xCenter + ',' + yTop +
                'L' + xLeft + ',' + yBottom + 'Z');
            corners.attr('d', 'M' + x0 + ',' + y0 + STARTMARKER +
                'M' + xLeft + ',' + yBottom + BLPATH +
                'M' + xRight + ',' + yBottom + BRPATH +
                'M' + xCenter + ',' + yTop + TOPPATH);
        }

        if(!dimmed) {
            zb.transition()
                .style('fill', lum > 0.2 ? 'rgba(0,0,0,0.4)' :
                    'rgba(255,255,255,0.3)')
                .duration(200);
            corners.transition()
                .style('opacity', 1)
                .duration(200);
            dimmed = true;
        }

        gd.emit('plotly_relayouting', makeUpdate(mins));
    }

    function zoomDone() {
        removeZoombox(gd);

        if(mins === mins0) return;

        Registry.call('_guiRelayout', gd, makeUpdate(mins));

        if(SHOWZOOMOUTTIP && gd.data && gd._context.showTips) {
            Lib.notifier(_(gd, 'Double-click to zoom back out'), 'long');
            SHOWZOOMOUTTIP = false;
        }
    }

    function panPrep() {
        mins0 = {
            a: _this.aaxis.range[0],
            b: _this.baxis.range[1],
            c: _this.caxis.range[1]
        };
        mins = mins0;
    }

    function plotDrag(dx: any, dy: any) {
        const dxScaled = dx / _this.xaxis._m;
        const dyScaled = dy / _this.yaxis._m;
        mins = {
            a: mins0.a - dyScaled,
            b: mins0.b + (dxScaled + dyScaled) / 2,
            c: mins0.c - (dxScaled - dyScaled) / 2
        };
        const minsorted = [mins.a, mins.b, mins.c].sort(Lib.sorterAsc);
        const minindices = {
            a: minsorted.indexOf(mins.a),
            b: minsorted.indexOf(mins.b),
            c: minsorted.indexOf(mins.c)
        };
        if(minsorted[0] < 0) {
            if(minsorted[1] + minsorted[0] / 2 < 0) {
                minsorted[2] += minsorted[0] + minsorted[1];
                minsorted[0] = minsorted[1] = 0;
            } else {
                minsorted[2] += minsorted[0] / 2;
                minsorted[1] += minsorted[0] / 2;
                minsorted[0] = 0;
            }
            mins = {
                a: minsorted[minindices.a],
                b: minsorted[minindices.b],
                c: minsorted[minindices.c]
            };
            dy = (mins0.a - mins.a) * _this.yaxis._m;
            dx = (mins0.c - mins.c - mins0.b + mins.b) * _this.xaxis._m;
        }

        // move the data (translate, don't redraw)
        const plotTransform = strTranslate(_this.x0 + dx, _this.y0 + dy);
        _this.plotContainer.selectAll('.scatterlayer,.maplayer')
            .attr('transform', plotTransform);

        const plotTransform2 = strTranslate(-dx, -dy);
        _this.clipDefRelative.select('path').attr('transform', plotTransform2);

        // move the ticks
        _this.aaxis.range = [mins.a, _this.sum - mins.b - mins.c];
        _this.baxis.range = [_this.sum - mins.a - mins.c, mins.b];
        _this.caxis.range = [_this.sum - mins.a - mins.b, mins.c];

        _this.drawAxes(false);

        if(_this._hasClipOnAxisFalse) {
            _this.plotContainer
                .select('.scatterlayer').selectAll('.trace')
                .call(hideOutsideRangePoints, _this);
        }

        gd.emit('plotly_relayouting', makeUpdate(mins));
    }

    function dragDone() {
        Registry.call('_guiRelayout', gd, makeUpdate(mins));
    }

    // finally, set up hover and click
    // these event handlers must already be set before dragElement.init
    // so it can stash them and override them.
    dragger.onmousemove = function(evt: any) {
        Fx.hover(gd, evt, _this.id);
        gd._fullLayout._lasthover = dragger;
        gd._fullLayout._hoversubplot = _this.id;
    };

    dragger.onmouseout = function(evt: any) {
        if(gd._dragging) return;

        dragElement.unhover(gd, evt);
    };

    dragElement.init(this.dragOptions);
};

function removeZoombox(gd: any) {
    select(gd)
        .selectAll('.zoombox,.js-zoombox-backdrop,.js-zoombox-menu,.zoombox-corners')
        .remove();
}
