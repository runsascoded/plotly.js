import tinycolor from 'tinycolor2';
const colorMix = tinycolor.mix;
import colorAttrs from '../../components/color/attributes.js';
import Lib from '../../lib/index.js';

export default function handleLineGridDefaults(containerIn?: any, containerOut?: any, coerce?: any, opts?: any): void {
    opts = opts || {};

    const dfltColor = opts.dfltColor;

    function coerce2(attr?: any, dflt?: any) {
        return Lib.coerce2(containerIn, containerOut, opts.attributes, attr, dflt);
    }

    const lineColor = coerce2('linecolor', dfltColor);
    const lineWidth = coerce2('linewidth');
    const showLine = coerce('showline', opts.showLine || !!lineColor || !!lineWidth);

    if(!showLine) {
        delete containerOut.linecolor;
        delete containerOut.linewidth;
    }

    const gridColorDflt = colorMix(dfltColor, opts.bgColor, opts.blend || colorAttrs.lightFraction).toRgbString();
    const gridColor = coerce2('gridcolor', gridColorDflt);
    const gridWidth = coerce2('gridwidth');
    const gridDash = coerce2('griddash');
    const showGridLines = coerce('showgrid', opts.showGrid ||
        !!gridColor ||
        !!gridWidth ||
        !!gridDash
    );

    if(!showGridLines) {
        delete containerOut.gridcolor;
        delete containerOut.gridwidth;
        delete containerOut.griddash;
    }

    if(opts.hasMinor) {
        const minorGridColorDflt = colorMix(containerOut.gridcolor, opts.bgColor, 67).toRgbString();
        const minorGridColor = coerce2('minor.gridcolor', minorGridColorDflt);
        const minorGridWidth = coerce2('minor.gridwidth', containerOut.gridwidth || 1);
        const minorGridDash = coerce2('minor.griddash', containerOut.griddash || 'solid');
        const minorShowGridLines = coerce('minor.showgrid',
            !!minorGridColor ||
            !!minorGridWidth ||
            !!minorGridDash
        );

        if(!minorShowGridLines) {
            delete containerOut.minor.gridcolor;
            delete containerOut.minor.gridwidth;
            delete containerOut.minor.griddash;
        }
    }

    if(!opts.noZeroLine) {
        const zeroLineLayer = coerce2('zerolinelayer');
        const zeroLineColor = coerce2('zerolinecolor', dfltColor);
        const zeroLineWidth = coerce2('zerolinewidth');
        const showZeroLine = coerce('zeroline', opts.showGrid || !!zeroLineColor || !!zeroLineWidth);

        if(!showZeroLine) {
            delete containerOut.zerolinelayer;
            delete containerOut.zerolinecolor;
            delete containerOut.zerolinewidth;
        }
    }
}
