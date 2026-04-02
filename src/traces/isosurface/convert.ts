import { gl_mesh3d as createMesh } from '../../../stackgl_modules/esm.js';
import _gl_format_color from '../../lib/gl_format_color.js';
const { parseColorScale } = _gl_format_color;
import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
import str2RgbaArray from '../../lib/str2rgbarray.js';
import _index2 from '../../components/colorscale/index.js';
const { extractOpts } = _index2;
import zip3 from '../../plots/gl3d/zip3.js';

const findNearestOnAxis = function(w: any, arr: any) {
    for(let q = arr.length - 1; q > 0; q--) {
        const min = Math.min(arr[q], arr[q - 1]);
        const max = Math.max(arr[q], arr[q - 1]);
        if(max > min && min < w && w <= max) {
            return {
                id: q,
                distRatio: (max - w) / (max - min)
            };
        }
    }
    return {
        id: 0,
        distRatio: 0
    };
};

function IsosurfaceTrace(this: any, scene: any, mesh: any, uid: any) {
    this.scene = scene;
    this.uid = uid;
    this.mesh = mesh;
    this.name = '';
    this.data = null;
    this.showContour = false;
}

const proto = IsosurfaceTrace.prototype;

proto.handlePick = function(selection: any) {
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

proto.update = function(data: any) {
    const scene = this.scene;
    const layout = scene.fullSceneLayout;

    this.data = generateIsoMeshes(data);

    // Unpack position data
    function toDataCoords(axis: any, coord: any, scale: any, calendar: any) {
        return coord.map(function(x: any) {
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

const GRID_TYPES = ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx'];

function generateIsoMeshes(data: any) {
    data._meshI = [];
    data._meshJ = [];
    data._meshK = [];

    const showSurface = data.surface.show;
    const showSpaceframe = data.spaceframe.show;

    const surfaceFill = data.surface.fill;
    const spaceframeFill = data.spaceframe.fill;

    let drawingSurface = false;
    let drawingSpaceframe = false;

    let numFaces = 0;
    let numVertices: any;
    let beginVertextLength: any;

    const Xs = data._Xs;
    const Ys = data._Ys;
    const Zs = data._Zs;

    const width = Xs.length;
    const height = Ys.length;
    const depth = Zs.length;

    const filled = GRID_TYPES.indexOf(data._gridFill.replace(/-/g, '').replace(/\+/g, ''));

    const getIndex = function(i: any, j: any, k: any) {
        switch(filled) {
            case 5: // 'zyx'
                return k + depth * j + depth * height * i;
            case 4: // 'zxy'
                return k + depth * i + depth * width * j;
            case 3: // 'yzx'
                return j + height * k + height * depth * i;
            case 2: // 'yxz'
                return j + height * i + height * width * k;
            case 1: // 'xzy'
                return i + width * k + width * depth * j;
            default: // case 0: // 'xyz'
                return i + width * j + width * height * k;
        }
    };

    const minValues = data._minValues;
    const maxValues = data._maxValues;

    const vMin = data._vMin;
    const vMax = data._vMax;

    let allXs: any;
    let allYs: any;
    let allZs: any;
    let allVs: any;

    function findVertexId(x: any, y: any, z: any) {
        // could be used to find the vertex id of previously generated vertex within the group

        const len: any = allVs.length;
        for(let f = beginVertextLength; f < len; f++) {
            if(
                x === allXs[f] &&
                y === allYs[f] &&
                z === allZs[f]
            ) {
                return f;
            }
        }
        return -1;
    }

    function beginGroup() {
        beginVertextLength = numVertices;
    }

    function emptyVertices() {
        allXs = [];
        allYs = [];
        allZs = [];
        allVs = [];
        numVertices = 0;

        beginGroup();
    }

    function addVertex(x: any, y: any, z: any, v: any) {
        allXs.push(x);
        allYs.push(y);
        allZs.push(z);
        allVs.push(v);
        numVertices++;

        return numVertices - 1;
    }

    function addFace(a: any, b: any, c: any) {
        data._meshI.push(a);
        data._meshJ.push(b);
        data._meshK.push(c);
        numFaces++;

        return numFaces - 1;
    }

    function getCenter(A: any, B: any, C: any) {
        const M: any[] = [];
        for(let i = 0; i < A.length; i++) {
            M[i] = ((A[i] + B[i] + C[i]) / 3.0 as any);
        }
        return M;
    }

    function getBetween(A: any, B: any, r: any) {
        const M: any[] = [];
        for(let i = 0; i < A.length; i++) {
            M[i] = (A[i] * (1 - r) + r * B[i] as any);
        }
        return M;
    }

    let activeFill: any;
    function setFill(fill: any) {
        activeFill = fill;
    }

    function createOpenTri(xyzv: any, abc: any) {
        const A = xyzv[0];
        const B = xyzv[1];
        const C = xyzv[2];
        const G = getCenter(A, B, C);

        const r = Math.sqrt(1 - activeFill);
        const p1 = getBetween(G, A, r);
        const p2 = getBetween(G, B, r);
        const p3 = getBetween(G, C, r);

        const a = abc[0];
        const b = abc[1];
        const c = abc[2];

        return {
            xyzv: [
                [A, B, p2], [p2, p1, A],
                [B, C, p3], [p3, p2, B],
                [C, A, p1], [p1, p3, C]
            ],
            abc: [
                [a, b, -1], [-1, -1, a],
                [b, c, -1], [-1, -1, b],
                [c, a, -1], [-1, -1, c]
            ]
        };
    }

    function styleIncludes(style: any, char: any) {
        if(style === 'all' || style === null) return true;
        return (style.indexOf(char) > -1);
    }

    function mapValue(style: any, value: any) {
        if(style === null) return value;
        return style;
    }

    function drawTri(style: any, xyzv: any, abc: any): any {
        beginGroup();

        let allXYZVs = [xyzv];
        let allABCs = [abc];
        if(activeFill >= 1) {
            allXYZVs = [xyzv];
            allABCs = [abc];
        } else if(activeFill > 0) {
            const openTri = createOpenTri(xyzv, abc);
            allXYZVs = openTri.xyzv;
            allABCs = openTri.abc;
        }

        for(let f = 0; f < allXYZVs.length; f++) {
            xyzv = allXYZVs[f];
            abc = allABCs[f];

            const pnts: any[] = [];
            for(let i = 0; i < 3; i++) {
                const x = xyzv[i][0];
                const y = xyzv[i][1];
                const z = xyzv[i][2];
                const v = xyzv[i][3];

                const id = (abc[i] > -1) ? abc[i] : findVertexId(x, y, z);
                if(id > -1) {
                    pnts[i] = (id as any);
                } else {
                    pnts[i] = (addVertex(x, y, z, mapValue(style, v)) as any);
                }
            }

            addFace(pnts[0], pnts[1], pnts[2]);
        }
    }

    function drawQuad(style: any, xyzv: any, abcd: any): any {
        const makeTri = function(i: any, j: any, k: any) {
            drawTri(style, [xyzv[i], xyzv[j], xyzv[k]], [abcd[i], abcd[j], abcd[k]]);
        };

        makeTri(0, 1, 2);
        makeTri(2, 3, 0);
    }

    function drawTetra(style: any, xyzv: any, abcd: any): any {
        const makeTri = function(i: any, j: any, k: any) {
            drawTri(style, [xyzv[i], xyzv[j], xyzv[k]], [abcd[i], abcd[j], abcd[k]]);
        };

        makeTri(0, 1, 2);
        makeTri(3, 0, 1);
        makeTri(2, 3, 0);
        makeTri(1, 2, 3);
    }

    function calcIntersection(pointOut: any, pointIn: any, min: any, max: any) {
        let value = pointOut[3];

        if(value < min) value = min;
        if(value > max) value = max;

        const ratio = (pointOut[3] - value) / (pointOut[3] - pointIn[3] + 0.000000001); // we had to add this error to force solve the tiny caps

        const result: any[] = [];
        for(let s = 0; s < 4; s++) {
            result[s] = ((1 - ratio) * pointOut[s] + ratio * pointIn[s] as any);
        }
        return result;
    }

    function inRange(value: any, min: any, max: any) {
        return (
            value >= min &&
            value <= max
        );
    }

    function almostInFinalRange(value: any) {
        const vErr = 0.001 * (vMax - vMin);
        return (
            value >= vMin - vErr &&
            value <= vMax + vErr
        );
    }

    function getXYZV(indecies: any) {
        const xyzv: any[] = [];
        for(let q = 0; q < 4; q++) {
            const index = indecies[q];
            xyzv.push(
                [
                    data._x[index],
                    data._y[index],
                    data._z[index],
                    data._value[index]
                ] as any
            );
        }

        return xyzv;
    }

    const MAX_PASS = 3;

    function tryCreateTri(style: any, xyzv: any, abc: any, min: any, max: any, nPass?: any): any {
        if(!nPass) nPass = 1;

        abc = [-1, -1, -1]; // Note: for the moment we override indices
        // to run faster! But it is possible to comment this line
        // to reduce the number of vertices.

        let result = false;

        const ok = [
            inRange(xyzv[0][3], min, max),
            inRange(xyzv[1][3], min, max),
            inRange(xyzv[2][3], min, max)
        ];

        if(!ok[0] && !ok[1] && !ok[2]) {
            return false;
        }

        const tryDrawTri = function(style: any, xyzv: any, abc: any): any {
            if( // we check here if the points are in `real` iso-min/max range
                almostInFinalRange(xyzv[0][3]) &&
                almostInFinalRange(xyzv[1][3]) &&
                almostInFinalRange(xyzv[2][3])
            ) {
                drawTri(style, xyzv, abc);
                return true;
            } else if(nPass < MAX_PASS) {
                return tryCreateTri(style, xyzv, abc, vMin, vMax, ++nPass); // i.e. second pass using actual vMin vMax bounds
            }
            return false;
        };

        if(ok[0] && ok[1] && ok[2]) {
            return tryDrawTri(style, xyzv, abc) || result;
        }

        let interpolated = false;

        [
            [0, 1, 2],
            [2, 0, 1],
            [1, 2, 0]
        ].forEach(function(e) {
            if(ok[e[0]] && ok[e[1]] && !ok[e[2]]) {
                const A = xyzv[e[0]];
                const B = xyzv[e[1]];
                const C = xyzv[e[2]];

                const p1 = calcIntersection(C, A, min, max);
                const p2 = calcIntersection(C, B, min, max);

                result = tryDrawTri(style, [p2, p1, A], [-1, -1, abc[e[0]]]) || result;
                result = tryDrawTri(style, [A, B, p2], [abc[e[0]], abc[e[1]], -1]) || result;

                interpolated = true;
            }
        });
        if(interpolated) return result;

        [
            [0, 1, 2],
            [1, 2, 0],
            [2, 0, 1]
        ].forEach(function(e) {
            if(ok[e[0]] && !ok[e[1]] && !ok[e[2]]) {
                const A = xyzv[e[0]];
                const B = xyzv[e[1]];
                const C = xyzv[e[2]];

                const p1 = calcIntersection(B, A, min, max);
                const p2 = calcIntersection(C, A, min, max);

                result = tryDrawTri(style, [p2, p1, A], [-1, -1, abc[e[0]]]) || result;

                interpolated = true;
            }
        });
        return result;
    }

    function tryCreateTetra(style: any, abcd: any, min: any, max: any) {
        let result = false;

        const xyzv = getXYZV(abcd);

        const ok = [
            inRange(xyzv[0][3], min, max),
            inRange(xyzv[1][3], min, max),
            inRange(xyzv[2][3], min, max),
            inRange(xyzv[3][3], min, max)
        ];

        if(!ok[0] && !ok[1] && !ok[2] && !ok[3]) {
            return result;
        }

        if(ok[0] && ok[1] && ok[2] && ok[3]) {
            if(drawingSpaceframe) {
                result = drawTetra(style, xyzv, abcd) || result;
            }
            return result;
        }

        let interpolated = false;

        [
            [0, 1, 2, 3],
            [3, 0, 1, 2],
            [2, 3, 0, 1],
            [1, 2, 3, 0]
        ].forEach(function(e) {
            if(ok[e[0]] && ok[e[1]] && ok[e[2]] && !ok[e[3]]) {
                const A = xyzv[e[0]];
                const B = xyzv[e[1]];
                const C = xyzv[e[2]];
                const D = xyzv[e[3]];

                if(drawingSpaceframe) {
                    result = drawTri(style, [A, B, C], [abcd[e[0]], abcd[e[1]], abcd[e[2]]]) || result;
                } else {
                    const p1 = calcIntersection(D, A, min, max);
                    const p2 = calcIntersection(D, B, min, max);
                    const p3 = calcIntersection(D, C, min, max);

                    result = drawTri(null, [p1, p2, p3], [-1, -1, -1]) || result;
                }

                interpolated = true;
            }
        });
        if(interpolated) return result;

        [
            [0, 1, 2, 3],
            [1, 2, 3, 0],
            [2, 3, 0, 1],
            [3, 0, 1, 2],
            [0, 2, 3, 1],
            [1, 3, 2, 0]
        ].forEach(function(e) {
            if(ok[e[0]] && ok[e[1]] && !ok[e[2]] && !ok[e[3]]) {
                const A = xyzv[e[0]];
                const B = xyzv[e[1]];
                const C = xyzv[e[2]];
                const D = xyzv[e[3]];

                const p1 = calcIntersection(C, A, min, max);
                const p2 = calcIntersection(C, B, min, max);
                const p3 = calcIntersection(D, B, min, max);
                const p4 = calcIntersection(D, A, min, max);

                if(drawingSpaceframe) {
                    result = drawTri(style, [A, p4, p1], [abcd[e[0]], -1, -1]) || result;
                    result = drawTri(style, [B, p2, p3], [abcd[e[1]], -1, -1]) || result;
                } else {
                    result = drawQuad(null, [p1, p2, p3, p4], [-1, -1, -1, -1]) || result;
                }

                interpolated = true;
            }
        });
        if(interpolated) return result;

        [
            [0, 1, 2, 3],
            [1, 2, 3, 0],
            [2, 3, 0, 1],
            [3, 0, 1, 2]
        ].forEach(function(e) {
            if(ok[e[0]] && !ok[e[1]] && !ok[e[2]] && !ok[e[3]]) {
                const A = xyzv[e[0]];
                const B = xyzv[e[1]];
                const C = xyzv[e[2]];
                const D = xyzv[e[3]];

                const p1 = calcIntersection(B, A, min, max);
                const p2 = calcIntersection(C, A, min, max);
                const p3 = calcIntersection(D, A, min, max);

                if(drawingSpaceframe) {
                    result = drawTri(style, [A, p1, p2], [abcd[e[0]], -1, -1]) || result;
                    result = drawTri(style, [A, p2, p3], [abcd[e[0]], -1, -1]) || result;
                    result = drawTri(style, [A, p3, p1], [abcd[e[0]], -1, -1]) || result;
                } else {
                    result = drawTri(null, [p1, p2, p3], [-1, -1, -1]) || result;
                }

                interpolated = true;
            }
        });
        return result;
    }

    function addCube(style: any, p000: any, p001: any, p010: any, p011: any, p100: any, p101: any, p110: any, p111: any, min: any, max: any) {
        let result = false;

        if(drawingSurface) {
            if(styleIncludes(style, 'A')) {
                result = tryCreateTetra(null, [p000, p001, p010, p100], min, max) || result;
            }
            if(styleIncludes(style, 'B')) {
                result = tryCreateTetra(null, [p001, p010, p011, p111], min, max) || result;
            }
            if(styleIncludes(style, 'C')) {
                result = tryCreateTetra(null, [p001, p100, p101, p111], min, max) || result;
            }
            if(styleIncludes(style, 'D')) {
                result = tryCreateTetra(null, [p010, p100, p110, p111], min, max) || result;
            }
            if(styleIncludes(style, 'E')) {
                result = tryCreateTetra(null, [p001, p010, p100, p111], min, max) || result;
            }
        }

        if(drawingSpaceframe) {
            result = tryCreateTetra(style, [p001, p010, p100, p111], min, max) || result;
        }

        return result;
    }

    function addRect(style: any, a: any, b: any, c: any, d: any, min: any, max: any, previousResult: any) {
        return [
            (previousResult[0] === true) ? true :
            tryCreateTri(style, getXYZV([a, b, c]), [a, b, c], min, max),
            (previousResult[1] === true) ? true :
            tryCreateTri(style, getXYZV([c, d, a]), [c, d, a], min, max)
        ];
    }

    function begin2dCell(style: any, p00: any, p01: any, p10: any, p11: any, min: any, max: any, isEven: any, previousResult: any) {
        // used to create caps and/or slices on exact axis points
        if(isEven) {
            return addRect(style, p00, p01, p11, p10, min, max, previousResult);
        } else {
            return addRect(style, p01, p11, p10, p00, min, max, previousResult);
        }
    }

    function beginSection(style: any, i: number, j: number, k: number, min: any, max: any, distRatios: any, _previousResult?: any) {
        // used to create slices between axis points

        let result = false;
        let A: any, B: any, C: any, D: any;

        const makeSection = function() {
            result = tryCreateTri(style, [A, B, C], [-1, -1, -1], min, max) || result;
            result = tryCreateTri(style, [C, D, A], [-1, -1, -1], min, max) || result;
        };

        const rX = distRatios[0];
        const rY = distRatios[1];
        const rZ = distRatios[2];

        if(rX) {
            A = getBetween(getXYZV([getIndex(i, j - 0, k - 0)])[0], getXYZV([getIndex(i - 1, j - 0, k - 0)])[0], rX);
            B = getBetween(getXYZV([getIndex(i, j - 0, k - 1)])[0], getXYZV([getIndex(i - 1, j - 0, k - 1)])[0], rX);
            C = getBetween(getXYZV([getIndex(i, j - 1, k - 1)])[0], getXYZV([getIndex(i - 1, j - 1, k - 1)])[0], rX);
            D = getBetween(getXYZV([getIndex(i, j - 1, k - 0)])[0], getXYZV([getIndex(i - 1, j - 1, k - 0)])[0], rX);
            makeSection();
        }

        if(rY) {
            A = getBetween(getXYZV([getIndex(i - 0, j, k - 0)])[0], getXYZV([getIndex(i - 0, j - 1, k - 0)])[0], rY);
            B = getBetween(getXYZV([getIndex(i - 0, j, k - 1)])[0], getXYZV([getIndex(i - 0, j - 1, k - 1)])[0], rY);
            C = getBetween(getXYZV([getIndex(i - 1, j, k - 1)])[0], getXYZV([getIndex(i - 1, j - 1, k - 1)])[0], rY);
            D = getBetween(getXYZV([getIndex(i - 1, j, k - 0)])[0], getXYZV([getIndex(i - 1, j - 1, k - 0)])[0], rY);
            makeSection();
        }

        if(rZ) {
            A = getBetween(getXYZV([getIndex(i - 0, j - 0, k)])[0], getXYZV([getIndex(i - 0, j - 0, k - 1)])[0], rZ);
            B = getBetween(getXYZV([getIndex(i - 0, j - 1, k)])[0], getXYZV([getIndex(i - 0, j - 1, k - 1)])[0], rZ);
            C = getBetween(getXYZV([getIndex(i - 1, j - 1, k)])[0], getXYZV([getIndex(i - 1, j - 1, k - 1)])[0], rZ);
            D = getBetween(getXYZV([getIndex(i - 1, j - 0, k)])[0], getXYZV([getIndex(i - 1, j - 0, k - 1)])[0], rZ);
            makeSection();
        }

        return result;
    }

    function begin3dCell(style: any, p000: any, p001: any, p010: any, p011: any, p100: any, p101: any, p110: any, p111: any, min: any, max: any, isEven: any) {
        // used to create spaceframe and/or iso-surfaces

        let cellStyle = style;
        if(isEven) {
            if(drawingSurface && style === 'even') cellStyle = null;
            return addCube(cellStyle, p000, p001, p010, p011, p100, p101, p110, p111, min, max);
        } else {
            if(drawingSurface && style === 'odd') cellStyle = null;
            return addCube(cellStyle, p111, p110, p101, p100, p011, p010, p001, p000, min, max);
        }
    }

    function draw2dX(style: any, items: any, min: any, max: any, previousResult: any) {
        const result: any[] = [];
        let n = 0;
        for(let q = 0; q < items.length; q++) {
            const i = items[q];
            for(let k = 1; k < depth; k++) {
                for(let j = 1; j < height; j++) {
                    result.push(
                        begin2dCell(style,
                            getIndex(i, j - 1, k - 1),
                            getIndex(i, j - 1, k),
                            getIndex(i, j, k - 1),
                            getIndex(i, j, k),
                            min,
                            max,
                            (i + j + k) % 2,
                            (previousResult && previousResult[n]) ? previousResult[n] : []
                        )
                    );
                    n++;
                }
            }
        }
        return result;
    }

    function draw2dY(style: any, items: any, min: any, max: any, previousResult: any) {
        const result: any[] = [];
        let n = 0;
        for(let q = 0; q < items.length; q++) {
            const j = items[q];
            for(let i = 1; i < width; i++) {
                for(let k = 1; k < depth; k++) {
                    result.push(
                        begin2dCell(style,
                            getIndex(i - 1, j, k - 1),
                            getIndex(i, j, k - 1),
                            getIndex(i - 1, j, k),
                            getIndex(i, j, k),
                            min,
                            max,
                            (i + j + k) % 2,
                            (previousResult && previousResult[n]) ? previousResult[n] : []
                        )
                    );
                    n++;
                }
            }
        }
        return result;
    }

    function draw2dZ(style: any, items: any, min: any, max: any, previousResult: any) {
        const result: any[] = [];
        let n = 0;
        for(let q = 0; q < items.length; q++) {
            const k = items[q];
            for(let j = 1; j < height; j++) {
                for(let i = 1; i < width; i++) {
                    result.push(
                        begin2dCell(style,
                            getIndex(i - 1, j - 1, k),
                            getIndex(i - 1, j, k),
                            getIndex(i, j - 1, k),
                            getIndex(i, j, k),
                            min,
                            max,
                            (i + j + k) % 2,
                            (previousResult && previousResult[n]) ? previousResult[n] : []
                        )
                    );
                    n++;
                }
            }
        }
        return result;
    }

    function draw3d(style: any, min: any, max: any) {
        for(let k = 1; k < depth; k++) {
            for(let j = 1; j < height; j++) {
                for(let i = 1; i < width; i++) {
                    begin3dCell(style,
                        getIndex(i - 1, j - 1, k - 1),
                        getIndex(i - 1, j - 1, k),
                        getIndex(i - 1, j, k - 1),
                        getIndex(i - 1, j, k),
                        getIndex(i, j - 1, k - 1),
                        getIndex(i, j - 1, k),
                        getIndex(i, j, k - 1),
                        getIndex(i, j, k),
                        min,
                        max,
                        (i + j + k) % 2
                    );
                }
            }
        }
    }

    function drawSpaceframe(style: any, min: any, max: any) {
        drawingSpaceframe = true;
        draw3d(style, min, max);
        drawingSpaceframe = false;
    }

    function drawSurface(style: any, min: any, max: any) {
        drawingSurface = true;
        draw3d(style, min, max);
        drawingSurface = false;
    }

    function drawSectionX(style: any, items: any, min: any, max: any, distRatios: any, previousResult: any) {
        const result: any[] = [];
        let n = 0;
        for(let q = 0; q < items.length; q++) {
            const i = items[q];
            for(let k = 1; k < depth; k++) {
                for(let j = 1; j < height; j++) {
                    result.push(
                        beginSection(style, i, j, k, min, max, distRatios[q],
                            (previousResult && previousResult[n]) ? previousResult[n] : []
                        )
                    );
                    n++;
                }
            }
        }
        return result;
    }

    function drawSectionY(style: any, items: any, min: any, max: any, distRatios: any, previousResult: any) {
        const result: any[] = [];
        let n = 0;
        for(let q = 0; q < items.length; q++) {
            const j = items[q];
            for(let i = 1; i < width; i++) {
                for(let k = 1; k < depth; k++) {
                    result.push(
                        beginSection(style, i, j, k, min, max, distRatios[q],
                            (previousResult && previousResult[n]) ? previousResult[n] : []
                        )
                    );
                    n++;
                }
            }
        }
        return result;
    }

    function drawSectionZ(style: any, items: any, min: any, max: any, distRatios: any, previousResult: any) {
        const result: any[] = [];
        let n = 0;
        for(let q = 0; q < items.length; q++) {
            const k = items[q];
            for(let j = 1; j < height; j++) {
                for(let i = 1; i < width; i++) {
                    result.push(
                        beginSection(style, i, j, k, min, max, distRatios[q],
                            (previousResult && previousResult[n]) ? previousResult[n] : []
                        )
                    );
                    n++;
                }
            }
        }
        return result;
    }

    function createRange(a: any, b: any) {
        const range: any[] = [];
        for(let q = a; q < b; q++) {
            range.push(q);
        }
        return range;
    }

    function insertGridPoints() {
        for(let i = 0; i < width; i++) {
            for(let j = 0; j < height; j++) {
                for(let k = 0; k < depth; k++) {
                    const index = getIndex(i, j, k);
                    addVertex(
                        data._x[index],
                        data._y[index],
                        data._z[index],
                        data._value[index]
                    );
                }
            }
        }
    }

    function drawAll() {
        emptyVertices();

        // insert grid points
        insertGridPoints();

        const activeStyle = null;

        // draw spaceframes
        if(showSpaceframe && spaceframeFill) {
            setFill(spaceframeFill);

            drawSpaceframe(activeStyle, vMin, vMax);
        }

        // draw iso-surfaces
        if(showSurface && surfaceFill) {
            setFill(surfaceFill);

            const surfacePattern = data.surface.pattern;
            const surfaceCount = data.surface.count;
            for(let q = 0; q < surfaceCount; q++) {
                const ratio = (surfaceCount === 1) ? 0.5 : q / (surfaceCount - 1);
                const level = (1 - ratio) * vMin + ratio * vMax;

                const d1 = Math.abs(level - minValues);
                const d2 = Math.abs(level - maxValues);
                const ranges = (d1 > d2) ?
                    [minValues, level] :
                    [level, maxValues];

                drawSurface(surfacePattern, ranges[0], ranges[1]);
            }
        }

        const setupMinMax = [
            [ Math.min(vMin, maxValues), Math.max(vMin, maxValues) ],
            [ Math.min(minValues, vMax), Math.max(minValues, vMax) ]
        ];

        ['x', 'y', 'z'].forEach(function(e) {
            const preRes: any[] = [];
            for(let s = 0; s < setupMinMax.length; s++) {
                let count = 0;

                const activeMin = setupMinMax[s][0];
                const activeMax = setupMinMax[s][1];

                // draw slices
                const slice = data.slices[e];
                if(slice.show && slice.fill) {
                    setFill(slice.fill);

                    let exactIndices: any[] = [];
                    const ceilIndices: any[] = [];
                    const distRatios: any[] = [];
                    if(slice.locations.length) {
                        for(let q = 0; q < slice.locations.length; q++) {
                            const near = findNearestOnAxis(
                                slice.locations[q],
                                (e === 'x') ? Xs :
                                (e === 'y') ? Ys : Zs
                            );

                            if(near.distRatio === 0) {
                                exactIndices.push(near.id);
                            } else if(near.id > 0) {
                                ceilIndices.push(near.id);
                                if(e === 'x') {
                                    distRatios.push([near.distRatio, 0, 0]);
                                } else if(e === 'y') {
                                    distRatios.push([0, near.distRatio, 0]);
                                } else {
                                    distRatios.push([0, 0, near.distRatio]);
                                }
                            }
                        }
                    } else {
                        if(e === 'x') {
                            exactIndices = createRange(1, width - 1);
                        } else if(e === 'y') {
                            exactIndices = createRange(1, height - 1);
                        } else {
                            exactIndices = createRange(1, depth - 1);
                        }
                    }

                    if(ceilIndices.length > 0) {
                        if(e === 'x') {
                            preRes[count] = (drawSectionX(activeStyle, ceilIndices, activeMin, activeMax, distRatios, preRes[count]) as any);
                        } else if(e === 'y') {
                            preRes[count] = (drawSectionY(activeStyle, ceilIndices, activeMin, activeMax, distRatios, preRes[count]) as any);
                        } else {
                            preRes[count] = (drawSectionZ(activeStyle, ceilIndices, activeMin, activeMax, distRatios, preRes[count]) as any);
                        }
                        count++;
                    }

                    if(exactIndices.length > 0) {
                        if(e === 'x') {
                            preRes[count] = (draw2dX(activeStyle, exactIndices, activeMin, activeMax, preRes[count]) as any);
                        } else if(e === 'y') {
                            preRes[count] = (draw2dY(activeStyle, exactIndices, activeMin, activeMax, preRes[count]) as any);
                        } else {
                            preRes[count] = (draw2dZ(activeStyle, exactIndices, activeMin, activeMax, preRes[count]) as any);
                        }
                        count++;
                    }
                }

                // draw caps
                const cap = data.caps[e];
                if(cap.show && cap.fill) {
                    setFill(cap.fill);
                    if(e === 'x') {
                        preRes[count] = (draw2dX(activeStyle, [0, width - 1], activeMin, activeMax, preRes[count]) as any);
                    } else if(e === 'y') {
                        preRes[count] = (draw2dY(activeStyle, [0, height - 1], activeMin, activeMax, preRes[count]) as any);
                    } else {
                        preRes[count] = (draw2dZ(activeStyle, [0, depth - 1], activeMin, activeMax, preRes[count]) as any);
                    }
                    count++;
                }
            }
        });

        // remove vertices arrays (i.e. grid points) in case no face was created.
        if(numFaces === 0) {
            emptyVertices();
        }

        data._meshX = allXs;
        data._meshY = allYs;
        data._meshZ = allZs;
        data._meshIntensity = allVs;

        data._Xs = Xs;
        data._Ys = Ys;
        data._Zs = Zs;
    }

    drawAll();

    return data;
}

function createIsosurfaceTrace(scene: any, data: any) {
    const gl = scene.glplot.gl;
    const mesh = createMesh({gl: gl});
    // @ts-ignore TS7009
    const result: any = (new IsosurfaceTrace(scene, mesh, data.uid) as any);

    mesh._trace = result;
    result.update(data);
    scene.glplot.add(mesh);
    return result;
}

export default {
    findNearestOnAxis: findNearestOnAxis,
    generateIsoMeshes: generateIsoMeshes,
    createIsosurfaceTrace: createIsosurfaceTrace,
};
