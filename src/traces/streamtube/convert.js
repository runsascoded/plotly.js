import { gl_streamtube3d as tube2mesh } from '../../../stackgl_modules/esm.js';
import Lib from '../../lib/index.js';
import _gl_format_color from '../../lib/gl_format_color.js';
const { parseColorScale } = _gl_format_color;
import _index from '../../components/colorscale/index.js';
const { extractOpts } = _index;
import zip3 from '../../plots/gl3d/zip3.js';
const createTubeMesh = tube2mesh.createTubeMesh;
const axisName2scaleIndex = { xaxis: 0, yaxis: 1, zaxis: 2 };
function Streamtube(scene, uid) {
    this.scene = scene;
    this.uid = uid;
    this.mesh = null;
    this.data = null;
}
const proto = Streamtube.prototype;
proto.handlePick = function (selection) {
    const sceneLayout = this.scene.fullSceneLayout;
    const dataScale = this.scene.dataScale;
    function fromDataScale(v, axisName) {
        const ax = sceneLayout[axisName];
        const scale = dataScale[axisName2scaleIndex[axisName]];
        return ax.l2c(v) / scale;
    }
    if (selection.object === this.mesh) {
        const pos = selection.data.position;
        const uvx = selection.data.velocity;
        selection.traceCoordinate = [
            fromDataScale(pos[0], 'xaxis'),
            fromDataScale(pos[1], 'yaxis'),
            fromDataScale(pos[2], 'zaxis'),
            fromDataScale(uvx[0], 'xaxis'),
            fromDataScale(uvx[1], 'yaxis'),
            fromDataScale(uvx[2], 'zaxis'),
            // u/v/w norm
            selection.data.intensity * this.data._normMax,
            // divergence
            selection.data.divergence
        ];
        selection.textLabel = this.data.hovertext || this.data.text;
        return true;
    }
};
function getDfltStartingPositions(vec) {
    const len = vec.length;
    let s;
    if (len > 2) {
        s = vec.slice(1, len - 1);
    }
    else if (len === 2) {
        s = [(vec[0] + vec[1]) / 2];
    }
    else {
        s = vec;
    }
    return s;
}
function getBoundPads(vec) {
    const len = vec.length;
    if (len === 1) {
        return [0.5, 0.5];
    }
    else {
        return [vec[1] - vec[0], vec[len - 1] - vec[len - 2]];
    }
}
function convert(scene, trace) {
    const sceneLayout = scene.fullSceneLayout;
    const dataScale = scene.dataScale;
    const len = trace._len;
    const tubeOpts = {};
    function toDataCoords(arr, axisName) {
        const ax = sceneLayout[axisName];
        const scale = dataScale[axisName2scaleIndex[axisName]];
        return Lib.simpleMap(arr, function (v) { return ax.d2l(v) * scale; });
    }
    tubeOpts.vectors = zip3(toDataCoords(trace._u, 'xaxis'), toDataCoords(trace._v, 'yaxis'), toDataCoords(trace._w, 'zaxis'), len);
    // Over-specified mesh case, this would error in tube2mesh
    if (!len) {
        return {
            positions: [],
            cells: []
        };
    }
    const meshx = toDataCoords(trace._Xs, 'xaxis');
    const meshy = toDataCoords(trace._Ys, 'yaxis');
    const meshz = toDataCoords(trace._Zs, 'zaxis');
    tubeOpts.meshgrid = [meshx, meshy, meshz];
    tubeOpts.gridFill = trace._gridFill;
    const slen = trace._slen;
    if (slen) {
        tubeOpts.startingPositions = zip3(toDataCoords(trace._startsX, 'xaxis'), toDataCoords(trace._startsY, 'yaxis'), toDataCoords(trace._startsZ, 'zaxis'));
    }
    else {
        // Default starting positions:
        //
        // if len>2, cut xz plane at min-y,
        // takes all x/y/z pts on that plane except those on the edges
        // to generate "well-defined" tubes,
        //
        // if len=2, take position halfway between two the pts,
        //
        // if len=1, take that pt
        const sy0 = meshy[0];
        const sx = getDfltStartingPositions(meshx);
        const sz = getDfltStartingPositions(meshz);
        const startingPositions = new Array(sx.length * sz.length);
        let m = 0;
        for (let i = 0; i < sx.length; i++) {
            for (let k = 0; k < sz.length; k++) {
                startingPositions[m++] = [sx[i], sy0, sz[k]];
            }
        }
        tubeOpts.startingPositions = startingPositions;
    }
    tubeOpts.colormap = parseColorScale(trace);
    tubeOpts.tubeSize = trace.sizeref;
    tubeOpts.maxLength = trace.maxdisplayed;
    // add some padding around the bounds
    // to e.g. allow tubes starting from a slice of the x/y/z mesh
    // to go beyond bounds a little bit w/o getting clipped
    const xbnds = toDataCoords(trace._xbnds, 'xaxis');
    const ybnds = toDataCoords(trace._ybnds, 'yaxis');
    const zbnds = toDataCoords(trace._zbnds, 'zaxis');
    const xpads = getBoundPads(meshx);
    const ypads = getBoundPads(meshy);
    const zpads = getBoundPads(meshz);
    const bounds = [
        [xbnds[0] - xpads[0], ybnds[0] - ypads[0], zbnds[0] - zpads[0]],
        [xbnds[1] + xpads[1], ybnds[1] + ypads[1], zbnds[1] + zpads[1]]
    ];
    const meshData = tube2mesh(tubeOpts, bounds);
    // N.B. cmin/cmax correspond to the min/max vector norm
    // in the u/v/w arrays, which in general is NOT equal to max
    // intensity that colors the tubes.
    const cOpts = extractOpts(trace);
    meshData.vertexIntensityBounds = [cOpts.min / trace._normMax, cOpts.max / trace._normMax];
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
    trace._pad = meshData.tubeScale * trace.sizeref * 2;
    return meshData;
}
proto.update = function (data) {
    this.data = data;
    const meshData = convert(this.scene, data);
    this.mesh.update(meshData);
};
proto.dispose = function () {
    this.scene.glplot.remove(this.mesh);
    this.mesh.dispose();
};
function createStreamtubeTrace(scene, data) {
    const gl = scene.glplot.gl;
    const meshData = convert(scene, data);
    const mesh = createTubeMesh(gl, meshData);
    // @ts-ignore TS7009
    const streamtube = new Streamtube(scene, data.uid);
    streamtube.mesh = mesh;
    streamtube.data = data;
    mesh._trace = streamtube;
    scene.glplot.add(mesh);
    return streamtube;
}
export default createStreamtubeTrace;
