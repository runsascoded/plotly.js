import { gl_cone3d as conePlot } from '../../../stackgl_modules/esm.js';
import _index from '../../lib/index.js';
const { simpleMap, isArrayOrTypedArray } = _index;
import _gl_format_color from '../../lib/gl_format_color.js';
const { parseColorScale } = _gl_format_color;
import _index2 from '../../components/colorscale/index.js';
const { extractOpts } = _index2;
import zip3 from '../../plots/gl3d/zip3.js';
import { gl_cone3d as _req0 } from '../../../stackgl_modules/esm.js';
const createConeMesh = _req0.createConeMesh;

function Cone(scene, uid) {
    this.scene = scene;
    this.uid = uid;
    this.mesh = null;
    this.data = null;
}

const proto = Cone.prototype;

proto.handlePick = function(selection) {
    if(selection.object === this.mesh) {
        const selectIndex = selection.index = selection.data.index;
        const xx = this.data.x[selectIndex];
        const yy = this.data.y[selectIndex];
        const zz = this.data.z[selectIndex];
        const uu = this.data.u[selectIndex];
        const vv = this.data.v[selectIndex];
        const ww = this.data.w[selectIndex];

        selection.traceCoordinate = [
            xx, yy, zz,
            uu, vv, ww,
            Math.sqrt(uu * uu + vv * vv + ww * ww)
        ];

        const text = this.data.hovertext || this.data.text;
        if(isArrayOrTypedArray(text) && text[selectIndex] !== undefined) {
            selection.textLabel = text[selectIndex];
        } else if(text) {
            selection.textLabel = text;
        }

        return true;
    }
};

const axisName2scaleIndex = {xaxis: 0, yaxis: 1, zaxis: 2};
const anchor2coneOffset = {tip: 1, tail: 0, cm: 0.25, center: 0.5};
const anchor2coneSpan = {tip: 1, tail: 1, cm: 0.75, center: 0.5};

function convert(scene, trace) {
    const sceneLayout = scene.fullSceneLayout;
    const dataScale = scene.dataScale;
    const coneOpts: any = {};

    function toDataCoords(arr, axisName) {
        const ax = sceneLayout[axisName];
        const scale = dataScale[axisName2scaleIndex[axisName]];
        return simpleMap(arr, function(v) { return ax.d2l(v) * scale; });
    }

    coneOpts.vectors = zip3(
        toDataCoords(trace.u, 'xaxis'),
        toDataCoords(trace.v, 'yaxis'),
        toDataCoords(trace.w, 'zaxis'),
        trace._len
    );

    coneOpts.positions = zip3(
        toDataCoords(trace.x, 'xaxis'),
        toDataCoords(trace.y, 'yaxis'),
        toDataCoords(trace.z, 'zaxis'),
        trace._len
    );

    const cOpts = extractOpts(trace);
    coneOpts.colormap = parseColorScale(trace);
    coneOpts.vertexIntensityBounds = [cOpts.min / trace._normMax, cOpts.max / trace._normMax];
    coneOpts.coneOffset = anchor2coneOffset[trace.anchor];

    const sizemode = trace.sizemode;
    if(sizemode === 'scaled') {
        // unitless sizeref
        coneOpts.coneSize = trace.sizeref || 0.5;
    } else if(sizemode === 'absolute') {
        // sizeref here has unit of velocity
        coneOpts.coneSize = trace.sizeref && trace._normMax ?
            trace.sizeref / trace._normMax :
            0.5;
    } else if(sizemode === 'raw') {
        coneOpts.coneSize = trace.sizeref;
    }
    coneOpts.coneSizemode = sizemode;

    const meshData = conePlot(coneOpts);

    // pass gl-mesh3d lighting attributes
    const lp = trace.lightposition;
    meshData.lightPosition = [lp.x, lp.y, lp.z];
    meshData.ambient = trace.lighting.ambient;
    meshData.diffuse = trace.lighting.diffuse;
    meshData.specular = trace.lighting.specular;
    meshData.roughness = trace.lighting.roughness;
    meshData.fresnel = trace.lighting.fresnel;
    meshData.opacity = trace.opacity;

    // stash autorange pad value
    trace._pad = anchor2coneSpan[trace.anchor] * meshData.vectorScale * meshData.coneScale * trace._normMax;

    return meshData;
}

proto.update = function(data) {
    this.data = data;

    const meshData = convert(this.scene, data);
    this.mesh.update(meshData);
};

proto.dispose = function() {
    this.scene.glplot.remove(this.mesh);
    this.mesh.dispose();
};

function createConeTrace(scene, data) {
    const gl = scene.glplot.gl;

    const meshData = convert(scene, data);
    const mesh = createConeMesh(gl, meshData);

    const cone = new Cone(scene, data.uid);
    cone.mesh = mesh;
    cone.data = data;
    mesh._trace = cone;

    scene.glplot.add(mesh);

    return cone;
}

export default createConeTrace;
