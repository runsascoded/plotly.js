import type { GraphDiv } from '../../../../types/core';
import parseSvgPath from 'parse-svg-path';
import constants from './constants.js';
import cartesianHelpers from '../../selections/helpers.js';
const CIRCLE_SIDES = constants.CIRCLE_SIDES;
const SQRT2 = constants.SQRT2;

const p2r = cartesianHelpers.p2r;
const r2p = cartesianHelpers.r2p;

const iC = [0, 3, 4, 5, 6, 1, 2];
const iQS = [0, 3, 4, 1, 2];

export const writePaths = function(polygons: any) {
    const nI = polygons.length;
    if(!nI) return 'M0,0Z';

    let str = '';
    for(let i = 0; i < nI; i++) {
        const nJ = polygons[i].length;
        for(let j = 0; j < nJ; j++) {
            const w = polygons[i][j][0];
            if(w === 'Z') {
                str += 'Z';
            } else {
                const nK = polygons[i][j].length;
                for(let k = 0; k < nK; k++) {
                    let realK = k;
                    if(w === 'Q' || w === 'S') {
                        realK = iQS[k];
                    } else if(w === 'C') {
                        realK = iC[k];
                    }

                    str += polygons[i][j][realK];
                    if(k > 0 && k < nK - 1) {
                        str += ',';
                    }
                }
            }
        }
    }

    return str;
};

export const readPaths = function(str: any, gd: GraphDiv, plotinfo?: any, isActiveShape?: any) {
    const cmd = parseSvgPath(str);

    const polys = [];
    let n = -1;
    const newPoly = function() {
        n++;
        polys[n] = [];
    };

    let k;
    let x = 0;
    let y = 0;
    let initX;
    let initY;
    const recStart = function() {
        initX = x;
        initY = y;
    };

    recStart();
    for(let i = 0; i < cmd.length; i++) {
        const newPos = [];

        let x1, x2, y1, y2; // i.e. extra params for curves

        const c = cmd[i][0];
        let w = c;
        switch(c) {
            case 'M':
                newPoly();
                x = +cmd[i][1];
                y = +cmd[i][2];
                newPos.push([w, x, y]);

                recStart();
                break;

            case 'Q':
            case 'S':
                x1 = +cmd[i][1];
                y1 = +cmd[i][2];
                x = +cmd[i][3];
                y = +cmd[i][4];
                newPos.push([w, x, y, x1, y1]); // -> iQS order
                break;

            case 'C':
                x1 = +cmd[i][1];
                y1 = +cmd[i][2];
                x2 = +cmd[i][3];
                y2 = +cmd[i][4];
                x = +cmd[i][5];
                y = +cmd[i][6];
                newPos.push([w, x, y, x1, y1, x2, y2]); // -> iC order
                break;

            case 'T':
            case 'L':
                x = +cmd[i][1];
                y = +cmd[i][2];
                newPos.push([w, x, y]);
                break;

            case 'H':
                w = 'L'; // convert to line (for now)
                x = +cmd[i][1];
                newPos.push([w, x, y]);
                break;

            case 'V':
                w = 'L'; // convert to line (for now)
                y = +cmd[i][1];
                newPos.push([w, x, y]);
                break;

            case 'A':
                w = 'L'; // convert to line to handle circle
                let rx = +cmd[i][1];
                let ry = +cmd[i][2];
                if(!+cmd[i][4]) {
                    rx = -rx;
                    ry = -ry;
                }

                const cenX = x - rx;
                const cenY = y;
                for(k = 1; k <= CIRCLE_SIDES / 2; k++) {
                    const t = 2 * Math.PI * k / CIRCLE_SIDES;
                    newPos.push([
                        w,
                        cenX + rx * Math.cos(t),
                        cenY + ry * Math.sin(t)
                    ]);
                }
                break;

            case 'Z':
                if(x !== initX || y !== initY) {
                    x = initX;
                    y = initY;
                    newPos.push([w, x, y]);
                }
                break;
        }

        const domain = (plotinfo || {}).domain;
        const size = gd._fullLayout._size;
        const xPixelSized = plotinfo && plotinfo.xsizemode === 'pixel';
        const yPixelSized = plotinfo && plotinfo.ysizemode === 'pixel';
        const noOffset = isActiveShape === false;

        for(let j = 0; j < newPos.length; j++) {
            for(k = 0; k + 2 < 7; k += 2) {
                let _x = newPos[j][k + 1];
                let _y = newPos[j][k + 2];

                if(_x === undefined || _y === undefined) continue;
                // keep track of end point for Z
                x = _x;
                y = _y;

                if(plotinfo) {
                    if(plotinfo.xaxis && plotinfo.xaxis.p2r) {
                        if(noOffset) _x -= plotinfo.xaxis._offset;
                        if(xPixelSized) {
                            _x = r2p(plotinfo.xaxis, plotinfo.xanchor) + _x;
                        } else {
                            _x = p2r(plotinfo.xaxis, _x);
                        }
                    } else {
                        if(noOffset) _x -= size.l;
                        if(domain) _x = domain.x[0] + _x / size.w;
                        else _x = _x / size.w;
                    }

                    if(plotinfo.yaxis && plotinfo.yaxis.p2r) {
                        if(noOffset) _y -= plotinfo.yaxis._offset;
                        if(yPixelSized) {
                            _y = r2p(plotinfo.yaxis, plotinfo.yanchor) - _y;
                        } else {
                            _y = p2r(plotinfo.yaxis, _y);
                        }
                    } else {
                        if(noOffset) _y -= size.t;
                        if(domain) _y = domain.y[1] - _y / size.h;
                        else _y = 1 - _y / size.h;
                    }
                }

                newPos[j][k + 1] = _x;
                newPos[j][k + 2] = _y;
            }
            polys[n].push(
                newPos[j].slice()
            );
        }
    }

    return polys;
};

function almostEq(a: any, b: any) {
    return Math.abs(a - b) <= 1e-6;
}

function dist(a: any, b: any) {
    const dx = b[1] - a[1];
    const dy = b[2] - a[2];
    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}

export const pointsOnRectangle = function(cell: any) {
    const len = cell.length;
    if(len !== 5) return false;

    for(let j = 1; j < 3; j++) {
        const e01 = cell[0][j] - cell[1][j];
        const e32 = cell[3][j] - cell[2][j];

        if(!almostEq(e01, e32)) return false;

        const e03 = cell[0][j] - cell[3][j];
        const e12 = cell[1][j] - cell[2][j];
        if(!almostEq(e03, e12)) return false;
    }

    // N.B. rotated rectangles are not valid rects since rotation is not supported in shapes for now.
    if(
        !almostEq(cell[0][1], cell[1][1]) &&
        !almostEq(cell[0][1], cell[3][1])
    ) return false;

    // reject cases with zero area
    return !!(
        dist(cell[0], cell[1]) *
        dist(cell[0], cell[3])
    );
};

export const pointsOnEllipse = function(cell: any) {
    let len = cell.length;
    if(len !== CIRCLE_SIDES + 1) return false;

    // opposite diagonals should be the same
    len = CIRCLE_SIDES;
    for(let i = 0; i < len; i++) {
        const k = (len * 2 - i) % len;

        const k2 = (len / 2 + k) % len;
        const i2 = (len / 2 + i) % len;

        if(!almostEq(
            dist(cell[i], cell[i2]),
            dist(cell[k], cell[k2])
        )) return false;
    }
    return true;
};

export const handleEllipse = function(isEllipse: any, start: any, end: any) {
    if(!isEllipse) return [start, end]; // i.e. case of line

    const pos = ellipseOver({
        x0: start[0],
        y0: start[1],
        x1: end[0],
        y1: end[1]
    });

    const cx = (pos.x1 + pos.x0) / 2;
    const cy = (pos.y1 + pos.y0) / 2;
    let rx = (pos.x1 - pos.x0) / 2;
    let ry = (pos.y1 - pos.y0) / 2;

    // make a circle when one dimension is zero
    if(!rx) rx = ry = ry / SQRT2;
    if(!ry) ry = rx = rx / SQRT2;

    const cell = [];
    for(let i = 0; i < CIRCLE_SIDES; i++) {
        const t = i * 2 * Math.PI / CIRCLE_SIDES;
        cell.push([
            cx + rx * Math.cos(t),
            cy + ry * Math.sin(t),
        ]);
    }
    return cell;
};

export const ellipseOver = function(pos: any) {
    let x0 = pos.x0;
    let y0 = pos.y0;
    const x1 = pos.x1;
    const y1 = pos.y1;

    let dx = x1 - x0;
    let dy = y1 - y0;

    x0 -= dx;
    y0 -= dy;

    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    const scale = SQRT2;
    dx *= scale;
    dy *= scale;

    return {
        x0: cx - dx,
        y0: cy - dy,
        x1: cx + dx,
        y1: cy + dy
    };
};

export const fixDatesForPaths = function(polygons: any, xaxis: any, yaxis: any) {
    const xIsDate = xaxis.type === 'date';
    const yIsDate = yaxis.type === 'date';
    if(!xIsDate && !yIsDate) return polygons;

    for(let i = 0; i < polygons.length; i++) {
        for(let j = 0; j < polygons[i].length; j++) {
            for(let k = 0; k + 2 < polygons[i][j].length; k += 2) {
                if(xIsDate) polygons[i][j][k + 1] = polygons[i][j][k + 1].replace(' ', '_');
                if(yIsDate) polygons[i][j][k + 2] = polygons[i][j][k + 2].replace(' ', '_');
            }
        }
    }

    return polygons;
};

export default { writePaths, readPaths, pointsOnRectangle, pointsOnEllipse, handleEllipse, ellipseOver, fixDatesForPaths };
