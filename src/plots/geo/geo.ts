import { select } from 'd3-selection';
import * as geo from 'd3-geo';
import * as geoProjection from 'd3-geo-projection';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import { dashLine, setClipUrl, setRect } from '../../components/drawing/index.js';
import Fx from '../../components/fx/index.js';
import Plots from '../plots.js';
import Axes from '../cartesian/axes.js';
import _autorange from '../cartesian/autorange.js';
const { getAutoRange } = _autorange;
import dragElement from '../../components/dragelement/index.js';
import _index from '../../components/selections/index.js';
const { prepSelect, clearOutline, selectOnClick } = _index;
import createGeoZoom from './zoom.js';
import constants from './constants.js';
import geoUtils from '../../lib/geo_location_utils.js';
import topojsonUtils from '../../lib/topojson_utils.js';
import { feature as topojsonFeature } from 'topojson-client';
declare let PlotlyGeoAssets: any;
const geoPath = geo.geoPath;
const geoDistance = geo.geoDistance;
const strTranslate = Lib.strTranslate;

function Geo(this: any, opts: any) {
    this.id = opts.id;
    this.graphDiv = opts.graphDiv;
    this.container = opts.container;
    this.topojsonURL = opts.topojsonURL;
    this.isStatic = opts.staticPlot;

    this.topojsonName = null;
    this.topojson = null;

    this.projection = null;
    this.scope = null;
    this.viewInitial = null;
    this.fitScale = null;
    this.bounds = null;
    this.midPt = null;

    this.hasChoropleth = false;
    this.traceHash = {};

    this.layers = {};
    this.basePaths = {};
    this.dataPaths = {};
    this.dataPoints = {};

    this.clipDef = null;
    this.clipRect = null;
    this.bgRect = null;

    this.makeFramework();
}

const proto = Geo.prototype;

export default function createGeo(opts: any) {
    // @ts-ignore TS7009
    return (new Geo(opts) as any);
}

proto.plot = function(geoCalcData: any, fullLayout: any, promises: any, replot: any) {
    const _this = this;
    if(replot) return _this.update(geoCalcData, fullLayout, true);

    _this._geoCalcData = geoCalcData;
    _this._fullLayout = fullLayout;

    const geoLayout = fullLayout[this.id];
    let geoPromises: any[] = [];

    let needsTopojson = false;
    for(const k in constants.layerNameToAdjective) {
        if(k !== 'frame' && geoLayout['show' + k]) {
            needsTopojson = true;
            break;
        }
    }

    let hasMarkerAngles = false;
    for(let i = 0; i < geoCalcData.length; i++) {
        const trace = geoCalcData[0][0].trace;
        trace._geo = _this;

        if(trace.locationmode) {
            needsTopojson = true;
        }

        const marker = trace.marker;
        if(marker) {
            const angle = marker.angle;
            const angleref = marker.angleref;
            if(angle || angleref === 'north' || angleref === 'previous') hasMarkerAngles = true;
        }
    }
    this._hasMarkerAngles = hasMarkerAngles;

    if(needsTopojson) {
        const topojsonNameNew = topojsonUtils.getTopojsonName(geoLayout);
        if(_this.topojson === null || topojsonNameNew !== _this.topojsonName) {
            _this.topojsonName = topojsonNameNew;

            if(PlotlyGeoAssets.topojson[_this.topojsonName] === undefined) {
                geoPromises.push(_this.fetchTopojson());
            }
        }
    }

    geoPromises = geoPromises.concat((geoUtils.fetchTraceGeoData(geoCalcData) as any));

    promises.push(new Promise<void>(function(resolve, reject) {
        Promise.all(geoPromises).then(function() {
            _this.topojson = PlotlyGeoAssets.topojson[_this.topojsonName];
            _this.update(geoCalcData, fullLayout);
            resolve();
        })
        .catch(reject);
    }));
};

proto.fetchTopojson = function() {
    const _this = this;
    const topojsonPath = topojsonUtils.getTopojsonPath(_this.topojsonURL, _this.topojsonName);

    return new Promise<void>(function(resolve, reject) {
        window.fetch(topojsonPath).then(function(r) {
                if(!r.ok) {
                    if(r.status === 404) {
                        throw new Error([
                            'plotly.js could not find topojson file at',
                            topojsonPath + '.',
                            'Make sure the *topojsonURL* plot config option',
                            'is set properly.'
                        ].join(' '));
                    } else {
                        throw new Error([
                            'unexpected error while fetching topojson file at',
                            topojsonPath
                        ].join(' '));
                    }
                }
                return r.json();
            }).then(function(topojson) {
                PlotlyGeoAssets.topojson[_this.topojsonName] = topojson;
                resolve();
            }).catch(reject);
    });
};

proto.update = function(geoCalcData: any, fullLayout: any, replot: any) {
    const geoLayout = fullLayout[this.id];

    // important: maps with choropleth traces have a different layer order
    this.hasChoropleth = false;

    for(let i = 0; i < geoCalcData.length; i++) {
        const calcTrace = geoCalcData[i];
        const trace = calcTrace[0].trace;

        if(trace.type === 'choropleth') {
            this.hasChoropleth = true;
        }
        if(trace.visible === true && trace._length > 0) {
            trace._module.calcGeoJSON(calcTrace, fullLayout);
        }
    }

    if(!replot) {
        const hasInvalidBounds = this.updateProjection(geoCalcData, fullLayout);
        if(hasInvalidBounds) return;

        if(!this.viewInitial || this.scope !== geoLayout.scope) {
            this.saveViewInitial(geoLayout);
        }
    }
    this.scope = geoLayout.scope;

    this.updateBaseLayers(fullLayout, geoLayout);
    this.updateDims(fullLayout, geoLayout);
    this.updateFx(fullLayout, geoLayout);

    Plots.generalUpdatePerTraceModule(this.graphDiv, this, geoCalcData, geoLayout);

    const scatterLayer = this.layers.frontplot.select('.scatterlayer');
    this.dataPoints.point = scatterLayer.selectAll('.point');
    this.dataPoints.text = scatterLayer.selectAll('text');
    this.dataPaths.line = scatterLayer.selectAll('.js-line');

    const choroplethLayer = this.layers.backplot.select('.choroplethlayer');
    this.dataPaths.choropleth = choroplethLayer.selectAll('path');

    this._render();
};

proto.updateProjection = function(geoCalcData: any, fullLayout: any) {
    const gd = this.graphDiv;
    const geoLayout = fullLayout[this.id];
    const gs = fullLayout._size;
    const domain = geoLayout.domain;
    const projLayout = geoLayout.projection;

    const lonaxis = geoLayout.lonaxis;
    const lataxis = geoLayout.lataxis;
    const axLon = lonaxis._ax;
    const axLat = lataxis._ax;

    const projection = this.projection = getProjection(geoLayout);

    // setup subplot extent [[x0,y0], [x1,y1]]
    const extent = [[
        gs.l + gs.w * domain.x[0],
        gs.t + gs.h * (1 - domain.y[1])
    ], [
        gs.l + gs.w * domain.x[1],
        gs.t + gs.h * (1 - domain.y[0])
    ]];

    let center = geoLayout.center || {};
    let rotation = projLayout.rotation || {};
    let lonaxisRange = lonaxis.range || [];
    let lataxisRange = lataxis.range || [];

    if(geoLayout.fitbounds) {
        axLon._length = extent[1][0] - extent[0][0];
        axLat._length = extent[1][1] - extent[0][1];
        axLon.range = getAutoRange(gd, axLon);
        axLat.range = getAutoRange(gd, axLat);

        const midLon = (axLon.range[0] + axLon.range[1]) / 2;
        const midLat = (axLat.range[0] + axLat.range[1]) / 2;

        if(geoLayout._isScoped) {
            center = {lon: midLon, lat: midLat};
        } else if(geoLayout._isClipped) {
            center = {lon: midLon, lat: midLat};
            rotation = {lon: midLon, lat: midLat, roll: rotation.roll};

            const projType = projLayout.type;
            const lonHalfSpan = ((constants.lonaxisSpan as any)[projType] / 2) || 180;
            const latHalfSpan = ((constants.lataxisSpan as any)[projType] / 2) || 90;

            lonaxisRange = [midLon - lonHalfSpan, midLon + lonHalfSpan];
            lataxisRange = [midLat - latHalfSpan, midLat + latHalfSpan];
        } else {
            center = {lon: midLon, lat: midLat};
            rotation = {lon: midLon, lat: rotation.lat, roll: rotation.roll};
        }
    }

    // set 'pre-fit' projection
    projection
        .center([center.lon - rotation.lon, center.lat - rotation.lat])
        .rotate([-rotation.lon, -rotation.lat, rotation.roll])
        .parallels(projLayout.parallels);

    // fit projection 'scale' and 'translate' to set lon/lat ranges
    const rangeBox = makeRangeBox(lonaxisRange, lataxisRange);
    projection.fitExtent(extent, rangeBox);

    const b = this.bounds = projection.getBounds(rangeBox);
    const s = this.fitScale = projection.scale();
    const t = projection.translate();

    if(geoLayout.fitbounds) {
        const b2 = projection.getBounds(makeRangeBox(axLon.range, axLat.range));
        const k2 = Math.min(
            (b[1][0] - b[0][0]) / (b2[1][0] - b2[0][0]),
            (b[1][1] - b[0][1]) / (b2[1][1] - b2[0][1])
        );

        if(isFinite(k2)) {
            projection.scale(k2 * s);
        } else {
            Lib.warn('Something went wrong during' + this.id + 'fitbounds computations.');
        }
    } else {
        // adjust projection to user setting
        projection.scale(projLayout.scale * s);
    }

    // px coordinates of view mid-point,
    // useful to update `geo.center` after interactions
    const midPt = this.midPt = [
        (b[0][0] + b[1][0]) / 2,
        (b[0][1] + b[1][1]) / 2
    ];

    projection
        .translate([t[0] + (midPt[0] - t[0]), t[1] + (midPt[1] - t[1])])
        .clipExtent(b);

    // the 'albers usa' projection does not expose a 'center' method
    // so here's this hack to make it respond to 'geoLayout.center'
    if(geoLayout._isAlbersUsa) {
        const centerPx = projection([center.lon, center.lat]);
        const tt = projection.translate();

        projection.translate([
            tt[0] - (centerPx[0] - tt[0]),
            tt[1] - (centerPx[1] - tt[1])
        ]);
    }
};

proto.updateBaseLayers = function(fullLayout: any, geoLayout: any) {
    const _this = this;
    const topojson = _this.topojson;
    const layers = _this.layers;
    const basePaths = _this.basePaths;

    function isAxisLayer(d: any) {
        return (d === 'lonaxis' || d === 'lataxis');
    }

    function isLineLayer(d: any) {
        return Boolean((constants.lineLayers as any)[d]);
    }

    function isFillLayer(d: any) {
        return Boolean((constants.fillLayers as any)[d]);
    }

    const allLayers = this.hasChoropleth ?
        constants.layersForChoropleth :
        constants.layers;

    const layerData = allLayers.filter(function(d) {
        return (isLineLayer(d) || isFillLayer(d)) ? geoLayout['show' + d] :
            isAxisLayer(d) ? geoLayout[d].showgrid :
            true;
    });

    const join = _this.framework.selectAll('.layer')
        .data(layerData, String);

    join.exit().each(function(this: any, d: any) {
        delete layers[d];
        delete basePaths[d];
        select(this).remove();
    });

    join.enter().append('g')
        .attr('class', function(d: any) { return 'layer ' + d; })
        .each(function(this: any, d: any) {
            const layer = layers[d] = select(this);

            if(d === 'bg') {
                _this.bgRect = layer.append('rect')
                    .style('pointer-events', 'all');
            } else if(isAxisLayer(d)) {
                basePaths[d] = layer.append('path')
                    .style('fill', 'none');
            } else if(d === 'backplot') {
                layer.append('g')
                    .classed('choroplethlayer', true);
            } else if(d === 'frontplot') {
                layer.append('g')
                    .classed('scatterlayer', true);
            } else if(isLineLayer(d)) {
                basePaths[d] = layer.append('path')
                    .style('fill', 'none')
                    .style('stroke-miterlimit', 2);
            } else if(isFillLayer(d)) {
                basePaths[d] = layer.append('path')
                    .style('stroke', 'none');
            }
        });

    join.order();

    join.each(function(d: any) {
        const path = basePaths[d];
        const adj = (constants.layerNameToAdjective as any)[d];

        if(d === 'frame') {
            path.datum(constants.sphereSVG);
        } else if(isLineLayer(d) || isFillLayer(d)) {
            path.datum(topojsonFeature(topojson, topojson.objects[d]));
        } else if(isAxisLayer(d)) {
            path.datum(makeGraticule(d, geoLayout, fullLayout))
                .call(Color.stroke, geoLayout[d].gridcolor)
                .call(dashLine, geoLayout[d].griddash, geoLayout[d].gridwidth);
        }

        if(isLineLayer(d)) {
            path.call(Color.stroke, geoLayout[adj + 'color'])
                .call(dashLine, '', geoLayout[adj + 'width']);
        } else if(isFillLayer(d)) {
            path.call(Color.fill, geoLayout[adj + 'color']);
        }
    });
};

proto.updateDims = function(fullLayout: any, geoLayout: any) {
    const b = this.bounds;
    const hFrameWidth = (geoLayout.framewidth || 0) / 2;

    const l = b[0][0] - hFrameWidth;
    const t = b[0][1] - hFrameWidth;
    const w = b[1][0] - l + hFrameWidth;
    const h = b[1][1] - t + hFrameWidth;

    setRect(this.clipRect, l, t, w, h);

    this.bgRect
        .call(setRect, l, t, w, h)
        .call(Color.fill, geoLayout.bgcolor);

    this.xaxis._offset = l;
    this.xaxis._length = w;

    this.yaxis._offset = t;
    this.yaxis._length = h;
};

proto.updateFx = function(fullLayout: any, geoLayout: any) {
    const _this = this;
    const gd = _this.graphDiv;
    const bgRect = _this.bgRect;
    const dragMode = fullLayout.dragmode;
    const clickMode = fullLayout.clickmode;

    if(_this.isStatic) return;

    function zoomReset() {
        const viewInitial = _this.viewInitial;
        const updateObj: any = {};

        for(const k in viewInitial) {
            updateObj[_this.id + '.' + k] = viewInitial[k];
        }

        Registry.call('_guiRelayout', gd, updateObj);
        gd.emit('plotly_doubleclick', null);
    }

    function invert(lonlat: any) {
        return _this.projection.invert([
            lonlat[0] + _this.xaxis._offset,
            lonlat[1] + _this.yaxis._offset
        ]);
    }

    const fillRangeItems = function(eventData: any, poly: any) {
        if(poly.isRect) {
            const ranges = eventData.range = {};
            (ranges as any)[_this.id] = [
                invert([poly.xmin, poly.ymin]),
                invert([poly.xmax, poly.ymax])
            ];
        } else {
            const dataPts = eventData.lassoPoints = {};
            (dataPts as any)[_this.id] = poly.map(invert);
        }
    };

    // Note: dragOptions is needed to be declared for all dragmodes because
    // it's the object that holds persistent selection state.
    const dragOptions: any = {
        element: _this.bgRect.node(),
        gd: gd,
        plotinfo: {
            id: _this.id,
            xaxis: _this.xaxis,
            yaxis: _this.yaxis,
            fillRangeItems: fillRangeItems
        },
        xaxes: [_this.xaxis],
        yaxes: [_this.yaxis],
        subplot: _this.id,
        clickFn: function(numClicks: any) {
            if(numClicks === 2) {
                clearOutline(gd);
            }
        }
    };

    if(dragMode === 'pan') {
        bgRect.node().onmousedown = null;
        bgRect.call(createGeoZoom(_this, geoLayout));
        bgRect.on('dblclick.zoom', zoomReset);
        if(!gd._context._scrollZoom.geo) {
            bgRect.on('wheel.zoom', null);
        }
    } else if(dragMode === 'select' || dragMode === 'lasso') {
        bgRect.on('.zoom', null);

        dragOptions.prepFn = function(e: any, startX: any, startY: any) {
            prepSelect(e, startX, startY, dragOptions, dragMode);
        };

        dragElement.init(dragOptions);
    }

    bgRect.on('mousemove', function(event: any) {
        const lonlat = _this.projection.invert(Lib.getPositionFromD3Event(event));

        if(!lonlat) {
            return dragElement.unhover(gd, event);
        }

        _this.xaxis.p2c = function() { return lonlat[0]; };
        _this.yaxis.p2c = function() { return lonlat[1]; };

        Fx.hover(gd, event, _this.id);
    });

    bgRect.on('mouseout', function(event: any) {
        if(gd._dragging) return;
        dragElement.unhover(gd, event);
    });

    bgRect.on('click', function(event: any) {
        // For select and lasso the dragElement is handling clicks
        if(dragMode !== 'select' && dragMode !== 'lasso') {
            if(clickMode.indexOf('select') > -1) {
                selectOnClick(event, gd, [_this.xaxis], [_this.yaxis],
                  _this.id, dragOptions);
            }

            if(clickMode.indexOf('event') > -1) {
                // TODO: like pie and maps, this doesn't support right-click
                // actually this one is worse, as right-click starts a pan, or leaves
                // select in a weird state.
                // Also, only tangentially related, we should cancel hover during pan
                Fx.click(gd, event);
            }
        }
    });
};

proto.makeFramework = function() {
    const _this = this;
    const gd = _this.graphDiv;
    const fullLayout = gd._fullLayout;
    const clipId = 'clip' + fullLayout._uid + _this.id;

    _this.clipDef = fullLayout._clips.append('clipPath')
        .attr('id', clipId);

    _this.clipRect = _this.clipDef.append('rect');

    _this.framework = select(_this.container).append('g')
        .attr('class', 'geo ' + _this.id)
        .call(setClipUrl, clipId, gd);

    // sane lonlat to px
    _this.project = function(v: any) {
        const px = _this.projection(v);
        return px ?
            [px[0] - _this.xaxis._offset, px[1] - _this.yaxis._offset] :
            [null, null];
    };

    _this.xaxis = {
        _id: 'x',
        c2p: function(v: any) { return _this.project(v)[0]; }
    };

    _this.yaxis = {
        _id: 'y',
        c2p: function(v: any) { return _this.project(v)[1]; }
    };

    // mock axis for hover formatting
    _this.mockAxis = {
        type: 'linear',
        showexponent: 'all',
        exponentformat: 'B'
    };
    Axes.setConvert(_this.mockAxis, fullLayout);
};

proto.saveViewInitial = function(geoLayout: any) {
    const center = geoLayout.center || {};
    const projLayout = geoLayout.projection;
    const rotation = projLayout.rotation || {};

    this.viewInitial = {
        fitbounds: geoLayout.fitbounds,
        'projection.scale': projLayout.scale
    };

    let extra;
    if(geoLayout._isScoped) {
        extra = {
            'center.lon': center.lon,
            'center.lat': center.lat,
        };
    } else if(geoLayout._isClipped) {
        extra = {
            'projection.rotation.lon': rotation.lon,
            'projection.rotation.lat': rotation.lat
        };
    } else {
        extra = {
            'center.lon': center.lon,
            'center.lat': center.lat,
            'projection.rotation.lon': rotation.lon
        };
    }

    Lib.extendFlat(this.viewInitial, extra);
};

proto.render = function(mayRedrawOnUpdates: any) {
    if(this._hasMarkerAngles && mayRedrawOnUpdates) {
        this.plot(this._geoCalcData, this._fullLayout, [], true);
    } else {
        this._render();
    }
};

// [hot code path] (re)draw all paths which depend on the projection
proto._render = function() {
    const projection = this.projection;
    const pathFn = projection.getPath();
    let k;

    function translatePoints(d: any) {
        const lonlatPx = projection(d.lonlat);
        return lonlatPx ?
            strTranslate(lonlatPx[0], lonlatPx[1]) :
             null;
    }

    function hideShowPoints(d: any) {
        return projection.isLonLatOverEdges(d.lonlat) ? 'none' : null;
    }

    for(k in this.basePaths) {
        this.basePaths[k].attr('d', pathFn);
    }

    for(k in this.dataPaths) {
        this.dataPaths[k].attr('d', function(d: any) { return pathFn(d.geojson); });
    }

    for(k in this.dataPoints) {
        this.dataPoints[k]
            .attr('display', hideShowPoints)
            .attr('transform', translatePoints); // TODO: need to redraw points with marker angle instead of calling translatePoints
    }
};

// Helper that wraps d3[geo + /* Projection name /*]() which:
//
// - adds 'getPath', 'getBounds' convenience methods
// - scopes logic related to 'clipAngle'
// - adds 'isLonLatOverEdges' method
// - sets projection precision
// - sets methods that aren't always defined depending
//   on the projection type to a dummy 'd3-esque' function,
//
// This wrapper alleviates subsequent code of (many) annoying if-statements.
function getProjection(geoLayout: any) {
    const projLayout = geoLayout.projection;
    const projType = projLayout.type;

    let projName = (constants.projNames as any)[projType];
    // uppercase the first letter and add geo to the start of method name
    projName = 'geo' + Lib.titleCase(projName);
    const projFn = geo[projName] || geoProjection[projName];
    const projection = projFn();

    const clipAngle =
        geoLayout._isSatellite ? Math.acos(1 / projLayout.distance) * 180 / Math.PI :
        geoLayout._isClipped ? (constants.lonaxisSpan as any)[projType] / 2 : null;

    const methods = ['center', 'rotate', 'parallels', 'clipExtent'];
    const dummyFn = function(_: any) { return _ ? projection : []; };

    for(let i = 0; i < methods.length; i++) {
        const m = methods[i];
        if(typeof projection[m] !== 'function') {
            projection[m] = dummyFn;
        }
    }

    projection.isLonLatOverEdges = function(lonlat: any) {
        if(projection(lonlat) === null) {
            return true;
        }

        if(clipAngle) {
            const r = projection.rotate();
            const angle = geoDistance(lonlat, [-r[0], -r[1]]);
            const maxAngle = clipAngle * Math.PI / 180;
            return angle > maxAngle;
        } else {
            return false;
        }
    };

    projection.getPath = function() {
        return geoPath().projection(projection);
    };

    projection.getBounds = function(object: any) {
        return projection.getPath().bounds(object);
    };

    projection.precision(constants.precision);

    if(geoLayout._isSatellite) {
        projection.tilt(projLayout.tilt).distance(projLayout.distance);
    }

    if(clipAngle) {
        projection.clipAngle(clipAngle - constants.clipPad);
    }

    return projection;
}

function makeGraticule(axisName: any, geoLayout: any, fullLayout: any) {
    // equivalent to the d3 "ε"
    const epsilon = 1e-6;
    // same as the geoGraticule default
    const precision = 2.5;

    const axLayout = geoLayout[axisName];
    const scopeDefaults = (constants.scopeDefaults as any)[geoLayout.scope];
    let rng;
    let oppRng;
    let coordFn;

    if(axisName === 'lonaxis') {
        rng = scopeDefaults.lonaxisRange;
        oppRng = scopeDefaults.lataxisRange;
        coordFn = function(v: any, l: any) { return [v, l]; };
    } else if(axisName === 'lataxis') {
        rng = scopeDefaults.lataxisRange;
        oppRng = scopeDefaults.lonaxisRange;
        coordFn = function(v: any, l: any) { return [l, v]; };
    }

    const dummyAx = {
        type: 'linear',
        range: [rng[0], rng[1] - epsilon],
        tick0: axLayout.tick0,
        dtick: axLayout.dtick
    };

    Axes.setConvert(dummyAx, fullLayout);
    const vals = Axes.calcTicks(dummyAx);

    // remove duplicate on antimeridian
    if(!geoLayout.isScoped && axisName === 'lonaxis') {
        vals.pop();
    }

    const len = vals.length;
    const coords = new Array(len);

    for(let i = 0; i < len; i++) {
        const v = vals[i].x;
        const line = coords[i] = [] as any[];
        for(let l = oppRng[0]; l < oppRng[1] + precision; l += precision) {
            line.push((coordFn!(v, l) as any));
        }
    }

    return {
        type: 'MultiLineString',
        coordinates: coords
    };
}

// Returns polygon GeoJSON corresponding to lon/lat range box
// with well-defined direction
//
// Note that clipPad padding is added around range to avoid aliasing.
function makeRangeBox(lon: any, lat: any) {
    const clipPad = constants.clipPad;
    const lon0 = lon[0] + clipPad;
    let lon1 = lon[1] - clipPad;
    const lat0 = lat[0] + clipPad;
    const lat1 = lat[1] - clipPad;

    // to cross antimeridian w/o ambiguity
    if(lon0 > 0 && lon1 < 0) lon1 += 360;

    const dlon4 = (lon1 - lon0) / 4;

    return {
        type: 'Polygon',
        coordinates: [[
            [lon0, lat0],
            [lon0, lat1],
            [lon0 + dlon4, lat1],
            [lon0 + 2 * dlon4, lat1],
            [lon0 + 3 * dlon4, lat1],
            [lon1, lat1],
            [lon1, lat0],
            [lon1 - dlon4, lat0],
            [lon1 - 2 * dlon4, lat0],
            [lon1 - 3 * dlon4, lat0],
            [lon0, lat0]
        ]]
    };
}
