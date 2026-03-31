import type { FullTrace, InputTrace } from '../../../types/core';
import Color from '../../components/color/index.js';
import { isArrayOrTypedArray } from '../../lib/index.js';

function averageColors(colorscale: any[]): string {
    var color = Color.interpolate(colorscale[0][1], colorscale[1][1], 0.5);
    for(var i = 2; i < colorscale.length; i++) {
        var averageColorI = Color.interpolate(colorscale[i - 1][1], colorscale[i][1], 0.5);
        color = Color.interpolate(color, averageColorI, colorscale[i - 1][0] / colorscale[i][0]);
    }
    return color;
}

export default function fillColorDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, coerce: any, opts?: any): void {
    if(!opts) opts = {};

    var inheritColorFromMarker = false;

    if(traceOut.marker) {
        // don't try to inherit a color array
        var markerColor = traceOut.marker.color;
        var markerLineColor = (traceOut.marker.line || {}).color;

        if(markerColor && !isArrayOrTypedArray(markerColor)) {
            inheritColorFromMarker = markerColor;
        } else if(markerLineColor && !isArrayOrTypedArray(markerLineColor)) {
            inheritColorFromMarker = markerLineColor;
        }
    }

    var averageGradientColor;
    if(opts.moduleHasFillgradient) {
        var gradientOrientation = coerce('fillgradient.type');
        if(gradientOrientation !== 'none') {
            coerce('fillgradient.start');
            coerce('fillgradient.stop');
            var gradientColorscale = coerce('fillgradient.colorscale');

            // if a fillgradient is specified, we use the average gradient color
            // to specify fillcolor after all other more specific candidates
            // are considered, but before the global default color.
            // fillcolor affects the background color of the hoverlabel in this case.
            if(gradientColorscale) {
                averageGradientColor = averageColors(gradientColorscale);
            }
        }
    }

    coerce('fillcolor', Color.addOpacity(
        (traceOut.line || {}).color ||
        inheritColorFromMarker ||
        averageGradientColor ||
        defaultColor, 0.5
    ));
}
