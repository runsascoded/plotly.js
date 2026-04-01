import { select } from 'd3-selection';
import { dispatch } from 'd3-dispatch';
import * as d3Geo from 'd3-geo';
import { pointer } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import Lib from '../../lib/index.js';
import Registry from '../../registry.js';

declare var event: any;
var radians = Math.PI / 180;
var degrees = 180 / Math.PI;
var zoomstartStyle = {cursor: 'pointer'};
var zoomendStyle = {cursor: 'auto'};

function createGeoZoom(geo, geoLayout) {
    var projection = geo.projection;
    var zoomConstructor;

    if(geoLayout._isScoped) {
        zoomConstructor = zoomScoped;
    } else if(geoLayout._isClipped) {
        zoomConstructor = zoomClipped;
    } else {
        zoomConstructor = zoomNonClipped;
    }

    // TODO add a conic-specific zoom

    return zoomConstructor(geo, projection);
}

export default createGeoZoom;

// common to all zoom types
function initZoom(geo, projection) {
    return d3Zoom()
        .translate(projection.translate())
        .scale(projection.scale());
}

// sync zoom updates with user & full layout
function sync(geo, projection, cb) {
    var id = geo.id;
    var gd = geo.graphDiv;
    var layout = gd.layout;
    var userOpts = layout[id];
    var fullLayout = gd._fullLayout;
    var fullOpts = fullLayout[id];

    var preGUI: any = {};
    var eventData: any = {};

    function set(propStr, val) {
        preGUI[id + '.' + propStr] = Lib.nestedProperty(userOpts, propStr).get();
        Registry.call('_storeDirectGUIEdit', layout, fullLayout._preGUI, preGUI);

        var fullNp = Lib.nestedProperty(fullOpts, propStr);
        if(fullNp.get() !== val) {
            fullNp.set(val);
            Lib.nestedProperty(userOpts, propStr).set(val);
            eventData[id + '.' + propStr] = val;
        }
    }

    cb(set);
    set('projection.scale', projection.scale() / geo.fitScale);
    set('fitbounds', false);
    gd.emit('plotly_relayout', eventData);
}

// zoom for scoped projections
function zoomScoped(geo, projection) {
    var zoom = initZoom(geo, projection);

    function handleZoomstart() {
        select(this).style(zoomstartStyle);
    }

    function handleZoom() {
        projection
            .scale(event.scale)
            .translate(event.translate);
        geo.render(true);

        var center = projection.invert(geo.midPt);
        geo.graphDiv.emit('plotly_relayouting', {
            'geo.projection.scale': projection.scale() / geo.fitScale,
            'geo.center.lon': center[0],
            'geo.center.lat': center[1]
        });
    }

    function syncCb(set) {
        var center = projection.invert(geo.midPt);

        set('center.lon', center[0]);
        set('center.lat', center[1]);
    }

    function handleZoomend() {
        select(this).style(zoomendStyle);
        sync(geo, projection, syncCb);
    }

    zoom
        .on('zoomstart', handleZoomstart)
        .on('zoom', handleZoom)
        .on('zoomend', handleZoomend);

    return zoom;
}

// zoom for non-clipped projections
function zoomNonClipped(geo, projection) {
    var zoom = initZoom(geo, projection);

    var INSIDETOLORANCEPXS = 2;

    var mouse0, rotate0, translate0, lastRotate, zoomPoint,
        mouse1, rotate1, point1, didZoom;

    function position(x) { return projection.invert(x); }

    function outside(x) {
        var pos = position(x);
        if(!pos) return true;

        var pt = projection(pos);
        return (
            Math.abs(pt[0] - x[0]) > INSIDETOLORANCEPXS ||
            Math.abs(pt[1] - x[1]) > INSIDETOLORANCEPXS
        );
    }

    function handleZoomstart() {
        select(this).style(zoomstartStyle);

        mouse0 = pointer(event, this);
        rotate0 = projection.rotate();
        translate0 = projection.translate();
        lastRotate = rotate0;
        zoomPoint = position(mouse0);
    }

    function handleZoom() {
        mouse1 = pointer(event, this);

        if(outside(mouse0)) {
            zoom.scale(projection.scale());
            zoom.translate(projection.translate());
            return;
        }

        projection.scale(event.scale);
        projection.translate([translate0[0], event.translate[1]]);

        if(!zoomPoint) {
            mouse0 = mouse1;
            zoomPoint = position(mouse0);
        } else if(position(mouse1)) {
            point1 = position(mouse1);
            rotate1 = [lastRotate[0] + (point1[0] - zoomPoint[0]), rotate0[1], rotate0[2]];
            projection.rotate(rotate1);
            lastRotate = rotate1;
        }

        didZoom = true;
        geo.render(true);

        var rotate = projection.rotate();
        var center = projection.invert(geo.midPt);
        geo.graphDiv.emit('plotly_relayouting', {
            'geo.projection.scale': projection.scale() / geo.fitScale,
            'geo.center.lon': center[0],
            'geo.center.lat': center[1],
            'geo.projection.rotation.lon': -rotate[0]
        });
    }

    function handleZoomend() {
        select(this).style(zoomendStyle);
        if(didZoom) sync(geo, projection, syncCb);
    }

    function syncCb(set) {
        var rotate = projection.rotate();
        var center = projection.invert(geo.midPt);

        set('projection.rotation.lon', -rotate[0]);
        set('center.lon', center[0]);
        set('center.lat', center[1]);
    }

    zoom
        .on('zoomstart', handleZoomstart)
        .on('zoom', handleZoom)
        .on('zoomend', handleZoomend);

    return zoom;
}

// zoom for clipped projections
// inspired by https://www.jasondavies.com/maps/d3Geo.zoom.js
function zoomClipped(geo, projection) {
    var view: any = {r: projection.rotate(), k: projection.scale()};
    var zoom = initZoom(geo, projection);
    var event = d3eventDispatch(zoom, 'zoomstart', 'zoom', 'zoomend');
    var zooming = 0;
    var zoomOn = zoom.on;

    var zoomPoint;

    zoom.on('zoomstart', function(event) {
        select(this).style(zoomstartStyle);

        var mouse0 = pointer(event, this);
        var rotate0 = projection.rotate();
        var lastRotate = rotate0;
        var translate0 = projection.translate();
        var q = quaternionFromEuler(rotate0);

        zoomPoint = position(projection, mouse0);

        zoomOn.call(zoom, 'zoom', function(event) {
            var mouse1 = pointer(event, this);

            projection.scale(view.k = event.scale);

            if(!zoomPoint) {
                // if no zoomPoint, the mouse wasn't over the actual geography yet
                // maybe this point is the start... we'll find out next time!
                mouse0 = mouse1;
                zoomPoint = position(projection, mouse0);
            } else if(position(projection, mouse1)) {
                // check if the point is on the map
                // if not, don't do anything new but scale
                // if it is, then we can assume between will exist below
                // so we don't need the 'bank' function, whatever that is.

                // go back to original projection temporarily
                // except for scale... that's kind of independent?
                projection
                    .rotate(rotate0)
                    .translate(translate0);

                // calculate the new params
                var point1 = position(projection, mouse1);
                var between = rotateBetween(zoomPoint, point1);
                var newEuler = eulerFromQuaternion(multiply(q, between));
                var rotateAngles = view.r = unRoll(newEuler, zoomPoint, lastRotate);

                if(!isFinite(rotateAngles[0]) || !isFinite(rotateAngles[1]) ||
                   !isFinite(rotateAngles[2])) {
                    rotateAngles = lastRotate;
                }

                // update the projection
                projection.rotate(rotateAngles);
                lastRotate = rotateAngles;
            }

            zoomed(event.of(this, arguments));
        });

        zoomstarted(event.of(this, arguments));
    })
    .on('zoomend', function(event) {
        select(this).style(zoomendStyle);
        zoomOn.call(zoom, 'zoom', null);
        zoomended(event.of(this, arguments));
        sync(geo, projection, syncCb);
    })
    .on('zoom.redraw', function(event) {
        geo.render(true);

        var _rotate = projection.rotate();
        geo.graphDiv.emit('plotly_relayouting', {
            'geo.projection.scale': projection.scale() / geo.fitScale,
            'geo.projection.rotation.lon': -_rotate[0],
            'geo.projection.rotation.lat': -_rotate[1]
        });
    });

    function zoomstarted(dispatch) {
        if(!zooming++) dispatch({type: 'zoomstart'});
    }

    function zoomed(dispatch) {
        dispatch({type: 'zoom'});
    }

    function zoomended(dispatch) {
        if(!--zooming) dispatch({type: 'zoomend'});
    }

    function syncCb(set) {
        var _rotate = projection.rotate();
        set('projection.rotation.lon', -_rotate[0]);
        set('projection.rotation.lat', -_rotate[1]);
    }

    return Object.assign(zoom, { on: event.on.bind(event) });
}

// -- helper functions for zoomClipped

function position(projection, point) {
    var spherical = projection.invert(point);
    return spherical && isFinite(spherical[0]) && isFinite(spherical[1]) && cartesian(spherical);
}

function quaternionFromEuler(euler) {
    var lambda = 0.5 * euler[0] * radians;
    var phi = 0.5 * euler[1] * radians;
    var gamma = 0.5 * euler[2] * radians;
    var sinLambda = Math.sin(lambda);
    var cosLambda = Math.cos(lambda);
    var sinPhi = Math.sin(phi);
    var cosPhi = Math.cos(phi);
    var sinGamma = Math.sin(gamma);
    var cosGamma = Math.cos(gamma);
    return [
        cosLambda * cosPhi * cosGamma + sinLambda * sinPhi * sinGamma,
        sinLambda * cosPhi * cosGamma - cosLambda * sinPhi * sinGamma,
        cosLambda * sinPhi * cosGamma + sinLambda * cosPhi * sinGamma,
        cosLambda * cosPhi * sinGamma - sinLambda * sinPhi * cosGamma
    ];
}

function multiply(a, b) {
    var a0 = a[0];
    var a1 = a[1];
    var a2 = a[2];
    var a3 = a[3];
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    var b3 = b[3];
    return [
        a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3,
        a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
        a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1,
        a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0
    ];
}

function rotateBetween(a, b) {
    if(!a || !b) return;
    var axis = cross(a, b);
    var norm = Math.sqrt(dot(axis, axis));
    var halfgamma = 0.5 * Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    var k = Math.sin(halfgamma) / norm;
    return norm && [Math.cos(halfgamma), axis[2] * k, -axis[1] * k, axis[0] * k];
}

// input:
//   rotateAngles: a calculated set of Euler angles
//   pt: a point (cartesian in 3-space) to keep fixed
//   roll0: an initial roll, to be preserved
// output:
//   a set of Euler angles that preserve the projection of pt
//     but set roll (output[2]) equal to roll0
//     note that this doesn't depend on the particular projection,
//     just on the rotation angles
function unRoll(rotateAngles, pt, lastRotate) {
    // calculate the fixed point transformed by these Euler angles
    // but with the desired roll undone
    var ptRotated = rotateCartesian(pt, 2, rotateAngles[0]);
    ptRotated = rotateCartesian(ptRotated, 1, rotateAngles[1]);
    ptRotated = rotateCartesian(ptRotated, 0, rotateAngles[2] - lastRotate[2]);

    var x = pt[0];
    var y = pt[1];
    var z = pt[2];
    var f = ptRotated[0];
    var g = ptRotated[1];
    var h = ptRotated[2];

    // the following essentially solves:
    // ptRotated = rotateCartesian(rotateCartesian(pt, 2, newYaw), 1, newPitch)
    // for newYaw and newPitch, as best it can
    var theta = Math.atan2(y, x) * degrees;
    var a = Math.sqrt(x * x + y * y);
    var b;
    var newYaw1;

    if(Math.abs(g) > a) {
        newYaw1 = (g > 0 ? 90 : -90) - theta;
        b = 0;
    } else {
        newYaw1 = Math.asin(g / a) * degrees - theta;
        b = Math.sqrt(a * a - g * g);
    }

    var newYaw2 = 180 - newYaw1 - 2 * theta;
    var newPitch1 = (Math.atan2(h, f) - Math.atan2(z, b)) * degrees;
    var newPitch2 = (Math.atan2(h, f) - Math.atan2(z, -b)) * degrees;

    // which is closest to lastRotate[0,1]: newYaw/Pitch or newYaw2/Pitch2?
    var dist1 = angleDistance(lastRotate[0], lastRotate[1], newYaw1, newPitch1);
    var dist2 = angleDistance(lastRotate[0], lastRotate[1], newYaw2, newPitch2);

    if(dist1 <= dist2) return [newYaw1, newPitch1, lastRotate[2]];
    else return [newYaw2, newPitch2, lastRotate[2]];
}

function angleDistance(yaw0, pitch0, yaw1, pitch1) {
    var dYaw = angleMod(yaw1 - yaw0);
    var dPitch = angleMod(pitch1 - pitch0);
    return Math.sqrt(dYaw * dYaw + dPitch * dPitch);
}

// reduce an angle in degrees to [-180,180]
function angleMod(angle) {
    return (angle % 360 + 540) % 360 - 180;
}

// rotate a cartesian vector
// axis is 0 (x), 1 (y), or 2 (z)
// angle is in degrees
function rotateCartesian(vector, axis, angle) {
    var angleRads = angle * radians;
    var vectorOut = vector.slice();
    var ax1 = (axis === 0) ? 1 : 0;
    var ax2 = (axis === 2) ? 1 : 2;
    var cosa = Math.cos(angleRads);
    var sina = Math.sin(angleRads);

    vectorOut[ax1] = vector[ax1] * cosa - vector[ax2] * sina;
    vectorOut[ax2] = vector[ax2] * cosa + vector[ax1] * sina;

    return vectorOut;
}
function eulerFromQuaternion(q) {
    return [
        Math.atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * degrees,
        Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * degrees,
        Math.atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * degrees
    ];
}

function cartesian(spherical) {
    var lambda = spherical[0] * radians;
    var phi = spherical[1] * radians;
    var cosPhi = Math.cos(phi);
    return [
        cosPhi * Math.cos(lambda),
        cosPhi * Math.sin(lambda),
        Math.sin(phi)
    ];
}

function dot(a, b) {
    var s = 0;
    for(var i = 0, n = a.length; i < n; ++i) s += a[i] * b[i];
    return s;
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

// Like d3.dispatch, but for custom events abstracting native UI events. These
// events have a target component (such as a brush), a target element (such as
// the svg:g element containing the brush) and the standard arguments `d` (the
// target element's data) and `i` (the selection index of the target element).
function d3eventDispatch(target: any, ...restArgs: string[]): any {
    var argumentz = restArgs.slice();

    var _dispatch: any = (dispatch as any).apply(null, argumentz);

    _dispatch.of = function(thiz: any, argumentz: any) {
        return function(e1: any) {
            var e0: any;
            try {
                e0 = e1.sourceEvent = event;
                e1.target = target;
                event = e1;
                _dispatch[e1.type].apply(thiz, argumentz);
            } finally {
                event = e0;
            }
        };
    };

    return _dispatch;
}
