import { gl_mesh3d as createMesh } from '../../../stackgl_modules/esm.js';
import { delaunay_triangulate as triangulate } from '../../../stackgl_modules/esm.js';
import { alpha_shape as alphaShape } from '../../../stackgl_modules/esm.js';
import { convex_hull as convexHull } from '../../../stackgl_modules/esm.js';
import _gl_format_color from '../../lib/gl_format_color.js';
const { parseColorScale } = _gl_format_color;
import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
import str2RgbaArray from '../../lib/str2rgbarray.js';
import _index2 from '../../components/colorscale/index.js';
const { extractOpts } = _index2;
import zip3 from '../../plots/gl3d/zip3.js';

function Mesh3DTrace(scene, mesh, uid) {
    this.scene = scene;
    this.uid = uid;
    this.mesh = mesh;
    this.name = '';
    this.color = '#fff';
    this.data = null;
    this.showContour = false;
}

const proto = Mesh3DTrace.prototype;

proto.handlePick = function(selection) {
    if(selection.object === this.mesh) {
        const selectIndex = selection.index = selection.data.index;

        if(selection.data._cellCenter) {
            selection.traceCoordinate = selection.data.dataCoordinate;
        } else {
            selection.traceCoordinate = [
                this.data.x[selectIndex],
                this.data.y[selectIndex],
                this.data.z[selectIndex]
            ];
        }

        const text = this.data.hovertext || this.data.text;
        if(isArrayOrTypedArray(text) && text[selectIndex] !== undefined) {
            selection.textLabel = text[selectIndex];
        } else if(text) {
            selection.textLabel = text;
        }

        return true;
    }
};

function parseColorArray(colors) {
    const b = [];
    const len = colors.length;
    for(let i = 0; i < len; i++) {
        b[i] = str2RgbaArray(colors[i]);
    }
    return b;
}

// Unpack position data
function toDataCoords(axis, coord, scale, calendar) {
    const b = [];
    const len = coord.length;
    for(let i = 0; i < len; i++) {
        b[i] = axis.d2l(coord[i], 0, calendar) * scale;
    }
    return b;
}

// Round indices if passed as floats
function toRoundIndex(a) {
    const b = [];
    const len = a.length;
    for(let i = 0; i < len; i++) {
        b[i] = Math.round(a[i]);
    }
    return b;
}

function delaunayCells(delaunayaxis, positions) {
    const d = ['x', 'y', 'z'].indexOf(delaunayaxis);
    const b = [];
    const len = positions.length;
    for(let i = 0; i < len; i++) {
        b[i] = [positions[i][(d + 1) % 3], positions[i][(d + 2) % 3]];
    }
    return triangulate(b);
}

// Validate indices
function hasValidIndices(list, numVertices) {
    const len = list.length;
    for(let i = 0; i < len; i++) {
        if(list[i] <= -0.5 || list[i] >= numVertices - 0.5) { // Note: the indices would be rounded -0.49 is valid.
            return false;
        }
    }
    return true;
}

proto.update = function(data) {
    const scene = this.scene;
    const layout = scene.fullSceneLayout;

    this.data = data;

    const numVertices = data.x.length;

    const positions = zip3(
        toDataCoords(layout.xaxis, data.x, scene.dataScale[0], data.xcalendar),
        toDataCoords(layout.yaxis, data.y, scene.dataScale[1], data.ycalendar),
        toDataCoords(layout.zaxis, data.z, scene.dataScale[2], data.zcalendar)
    );

    let cells;
    if(data.i && data.j && data.k) {
        if(
            data.i.length !== data.j.length ||
            data.j.length !== data.k.length ||
            !hasValidIndices(data.i, numVertices) ||
            !hasValidIndices(data.j, numVertices) ||
            !hasValidIndices(data.k, numVertices)
        ) {
            return;
        }
        cells = zip3(
            toRoundIndex(data.i),
            toRoundIndex(data.j),
            toRoundIndex(data.k)
        );
    } else if(data.alphahull === 0) {
        cells = convexHull(positions);
    } else if(data.alphahull > 0) {
        cells = alphaShape(data.alphahull, positions);
    } else {
        cells = delaunayCells(data.delaunayaxis, positions);
    }

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
        contourEnable: data.contour.show,
        contourColor: str2RgbaArray(data.contour.color).slice(0, 3),
        contourWidth: data.contour.width,
        useFacetNormals: data.flatshading
    };

    if(data.intensity) {
        const cOpts = extractOpts(data);
        this.color = '#fff';
        const mode = data.intensitymode;
        config[mode + 'Intensity'] = data.intensity;
        config[mode + 'IntensityBounds'] = [cOpts.min, cOpts.max];
        config.colormap = parseColorScale(data);
    } else if(data.vertexcolor) {
        this.color = data.vertexcolor[0];
        config.vertexColors = parseColorArray(data.vertexcolor);
    } else if(data.facecolor) {
        this.color = data.facecolor[0];
        config.cellColors = parseColorArray(data.facecolor);
    } else {
        this.color = data.color;
        config.meshColor = str2RgbaArray(data.color);
    }

    // Update mesh
    this.mesh.update(config);
};

proto.dispose = function() {
    this.scene.glplot.remove(this.mesh);
    this.mesh.dispose();
};

function createMesh3DTrace(scene, data) {
    const gl = scene.glplot.gl;
    const mesh = createMesh({gl: gl});
    const result = new Mesh3DTrace(scene, mesh, data.uid);
    mesh._trace = result;
    result.update(data);
    scene.glplot.add(mesh);
    return result;
}

export default createMesh3DTrace;
