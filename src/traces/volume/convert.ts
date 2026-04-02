import { gl_mesh3d as createMesh } from '../../../stackgl_modules/esm.js';
import _gl_format_color from '../../lib/gl_format_color.js';
const { parseColorScale } = _gl_format_color;
import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
import str2RgbaArray from '../../lib/str2rgbarray.js';
import _index2 from '../../components/colorscale/index.js';
const { extractOpts } = _index2;
import zip3 from '../../plots/gl3d/zip3.js';
import _convert from '../isosurface/convert.js';
const { findNearestOnAxis, generateIsoMeshes } = _convert;

function VolumeTrace(scene, mesh, uid) {
    this.scene = scene;
    this.uid = uid;
    this.mesh = mesh;
    this.name = '';
    this.data = null;
    this.showContour = false;
}

const proto = VolumeTrace.prototype;

proto.handlePick = function(selection) {
    if(selection.object === this.mesh) {
        const rawId = selection.data.index;

        const x = this.data._meshX[rawId];
        const y = this.data._meshY[rawId];
        const z = this.data._meshZ[rawId];

        const height = this.data._Ys.length;
        const depth = this.data._Zs.length;

        const i = findNearestOnAxis(x, this.data._Xs).id;
        const j = findNearestOnAxis(y, this.data._Ys).id;
        const k = findNearestOnAxis(z, this.data._Zs).id;

        const selectIndex = selection.index = k + depth * j + depth * height * i;

        selection.traceCoordinate = [
            this.data._meshX[selectIndex],
            this.data._meshY[selectIndex],
            this.data._meshZ[selectIndex],
            this.data._value[selectIndex]
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

proto.update = function(data) {
    const scene = this.scene;
    const layout = scene.fullSceneLayout;

    this.data = generateIsoMeshes(data);

    // Unpack position data
    function toDataCoords(axis, coord, scale, calendar) {
        return coord.map(function(x) {
            return axis.d2l(x, 0, calendar) * scale;
        });
    }

    const positions = zip3(
        toDataCoords(layout.xaxis, data._meshX, scene.dataScale[0], data.xcalendar),
        toDataCoords(layout.yaxis, data._meshY, scene.dataScale[1], data.ycalendar),
        toDataCoords(layout.zaxis, data._meshZ, scene.dataScale[2], data.zcalendar));

    const cells = zip3(data._meshI, data._meshJ, data._meshK);

    const config: any = {
        positions: positions,
        cells: cells,
        lightPosition: [data.lightposition.x, data.lightposition.y, data.lightposition.z],
        ambient: data.lighting.ambient,
        diffuse: data.lighting.diffuse,
        specular: data.lighting.specular,
        roughness: data.lighting.roughness,
        fresnel: data.lighting.fresnel,
        vertexNormalsEpsilon: data.lighting.vertexnormalsepsilon,
        faceNormalsEpsilon: data.lighting.facenormalsepsilon,
        opacity: data.opacity,
        opacityscale: data.opacityscale,
        contourEnable: data.contour.show,
        contourColor: str2RgbaArray(data.contour.color).slice(0, 3),
        contourWidth: data.contour.width,
        useFacetNormals: data.flatshading
    };

    const cOpts = extractOpts(data);
    config.vertexIntensity = data._meshIntensity;
    config.vertexIntensityBounds = [cOpts.min, cOpts.max];
    config.colormap = parseColorScale(data);

    // Update mesh
    this.mesh.update(config);
};

proto.dispose = function() {
    this.scene.glplot.remove(this.mesh);
    this.mesh.dispose();
};

function createVolumeTrace(scene, data) {
    const gl = scene.glplot.gl;
    const mesh = createMesh({gl: gl});
    const result = new VolumeTrace(scene, mesh, data.uid);

    mesh._trace = result;
    result.update(data);
    scene.glplot.add(mesh);
    return result;
}

export default createVolumeTrace;
