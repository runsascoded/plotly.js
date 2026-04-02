import Lib from '../../lib/index.js';
import setConvertCartesian from '../cartesian/set_convert.js';

const deg2rad = Lib.deg2rad;
const rad2deg = Lib.rad2deg;

export default function setConvert(ax: any, polarLayout: any, fullLayout: any) {
    setConvertCartesian(ax, fullLayout);

    switch(ax._id) {
        case 'x':
        case 'radialaxis':
            setConvertRadial(ax, polarLayout);
            break;
        case 'angularaxis':
            setConvertAngular(ax, polarLayout);
            break;
    }
}

function setConvertRadial(ax: any, polarLayout: any) {
    const subplot = polarLayout._subplot;

    ax.setGeometry = function() {
        const rl0 = ax._rl[0];
        const rl1 = ax._rl[1];

        const b = subplot.innerRadius;
        const m = (subplot.radius - b) / (rl1 - rl0);
        const b2 = b / m;

        const rFilter = rl0 > rl1 ?
            function(v: any) { return v <= 0; } :
            function(v: any) { return v >= 0; };

        ax.c2g = function(v: any) {
            const r = ax.c2l(v) - rl0;
            return (rFilter(r) ? r : 0) + b2;
        };

        ax.g2c = function(v: any) {
            return ax.l2c(v + rl0 - b2);
        };

        ax.g2p = function(v: any) { return v * m; };
        ax.c2p = function(v: any) { return ax.g2p(ax.c2g(v)); };
    };
}

function toRadians(v: any, unit: any) {
    return unit === 'degrees' ? deg2rad(v) : v;
}

function fromRadians(v: any, unit: any) {
    return unit === 'degrees' ? rad2deg(v) : v;
}

function setConvertAngular(ax: any, polarLayout: any) {
    const axType = ax.type;

    if(axType === 'linear') {
        const _d2c = ax.d2c;
        const _c2d = ax.c2d;

        ax.d2c = function(v: any, unit: any) { return toRadians(_d2c(v), unit); };
        ax.c2d = function(v: any, unit: any) { return _c2d(fromRadians(v, unit)); };
    }

    // override makeCalcdata to handle thetaunit and special theta0/dtheta logic
    ax.makeCalcdata = function(trace: any, coord: any) {
        const arrayIn = trace[coord];
        const len = trace._length;
        let arrayOut, i;

        const _d2c = function(v: any) { return ax.d2c(v, trace.thetaunit); };

        if(arrayIn) {
            arrayOut = new Array(len);
            for(i = 0; i < len; i++) {
                arrayOut[i] = _d2c(arrayIn[i]);
            }
        } else {
            const coord0 = coord + '0';
            const dcoord = 'd' + coord;
            const v0 = (coord0 in trace) ? _d2c(trace[coord0]) : 0;
            const dv = (trace[dcoord]) ? _d2c(trace[dcoord]) : (ax.period || 2 * Math.PI) / len;

            arrayOut = new Array(len);
            for(i = 0; i < len; i++) {
                arrayOut[i] = v0 + i * dv;
            }
        }

        return arrayOut;
    };

    // N.B. we mock the axis 'range' here
    ax.setGeometry = function() {
        const sector = polarLayout.sector;
        const sectorInRad = sector.map(deg2rad);
        const dir = ({clockwise: -1, counterclockwise: 1} as any)[ax.direction];
        const rot = deg2rad(ax.rotation);

        const rad2g = function(v: any) { return dir * v + rot; };
        const g2rad = function(v: any) { return (v - rot) / dir; };

        let rad2c: any, c2rad: any;
        let rad2t: any, t2rad: any;

        switch(axType) {
            case 'linear':
                c2rad = rad2c = Lib.identity;
                t2rad = deg2rad;
                rad2t = rad2deg;

                // Set the angular range in degrees to make auto-tick computation cleaner,
                // changing rotation/direction should not affect the angular tick value.
                ax.range = Lib.isFullCircle(sectorInRad) ?
                    [sector[0], sector[0] + 360] :
                    sectorInRad.map(g2rad).map(rad2deg);
                break;

            case 'category':
                const catLen = ax._categories.length;
                let _period = ax.period ? Math.max(ax.period, catLen) : catLen;

                // fallback in case all categories have been filtered out
                if(_period === 0) _period = 1;

                c2rad = t2rad = function(v: any) { return v * 2 * Math.PI / _period; };
                rad2c = rad2t = function(v: any) { return v * _period / Math.PI / 2; };

                ax.range = [0, _period];
                break;
        }

        ax.c2g = function(v: any) { return rad2g(c2rad(v)); };
        ax.g2c = function(v: any) { return rad2c(g2rad(v)); };

        ax.t2g = function(v: any) { return rad2g(t2rad(v)); };
        ax.g2t = function(v: any) { return rad2t(g2rad(v)); };
    };
}
