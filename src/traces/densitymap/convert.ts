import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import Colorscale from '../../components/colorscale/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import { makeBlank } from '../../lib/geojson_utils.js';

export default function convert(calcTrace: any) {
    const trace = calcTrace[0].trace;
    const isVisible = (trace.visible === true && trace._length !== 0);

    const heatmap = {
        layout: {visibility: 'none'},
        paint: {}
    };

    const opts = trace._opts = {
        heatmap: heatmap,
        geojson: makeBlank()
    };

    // early return if not visible or placeholder
    if(!isVisible) return opts;

    const features: any[] = [];
    let i;

    const z = trace.z;
    const radius = trace.radius;
    const hasZ = Lib.isArrayOrTypedArray(z) && z.length;
    const hasArrayRadius = Lib.isArrayOrTypedArray(radius);

    for(i = 0; i < calcTrace.length; i++) {
        const cdi = calcTrace[i];
        const lonlat = cdi.lonlat;

        if(lonlat[0] !== BADNUM) {
            const props: any = {};

            if(hasZ) {
                const zi = cdi.z;
                props.z = zi !== BADNUM ? zi : 0;
            }
            if(hasArrayRadius) {
                props.r = (isNumeric(radius[i]) && radius[i] > 0) ? +radius[i] : 0;
            }

            features.push({
                type: 'Feature',
                geometry: {type: 'Point', coordinates: lonlat},
                properties: props
            });
        }
    }

    const cOpts = Colorscale.extractOpts(trace);
    const scl = cOpts.reversescale ?
        Colorscale.flipScale(cOpts.colorscale) :
        cOpts.colorscale;

    // Add alpha channel to first colorscale step.
    // If not, we would essentially color the entire map.
    // See https://maplibre.org/maplibre-gl-js/docs/examples/heatmap-layer/
    const scl01 = scl[0][1];
    const color0 = Color.opacity(scl01) < 1 ? scl01 : Color.addOpacity(scl01, 0);

    const heatmapColor = [
        'interpolate', ['linear'],
        ['heatmap-density'],
        0, color0
    ];
    for(i = 1; i < scl.length; i++) {
        heatmapColor.push(scl[i][0], scl[i][1]);
    }

    // Those "weights" have to be in [0, 1], we can do this either:
    // - as here using a map-gl expression
    // - or, scale the 'z' property in the feature loop
    const zExp = [
        'interpolate', ['linear'],
        ['get', 'z'],
        cOpts.min, 0,
        cOpts.max, 1
    ];

    Lib.extendFlat(opts.heatmap.paint, {
        'heatmap-weight': hasZ ? zExp : 1 / (cOpts.max - cOpts.min),

        'heatmap-color': heatmapColor,

        'heatmap-radius': hasArrayRadius ?
            {type: 'identity', property: 'r'} :
            trace.radius,

        'heatmap-opacity': trace.opacity
    });

    opts.geojson = {type: 'FeatureCollection', features: features} as any;
    opts.heatmap.layout.visibility = 'visible';

    return opts;
}
