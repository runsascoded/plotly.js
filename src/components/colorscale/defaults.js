import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import hasColorbar from '../colorbar/has_colorbar.js';
import colorbarDefaults from '../colorbar/defaults.js';
import _scales from './scales.js';
const { isValid: isValidScale } = _scales;
import { traceIs } from '../../registry.js';

function npMaybe(parentCont, prefix) {
    var containerStr = prefix.slice(0, prefix.length - 1);
    return prefix ?
        Lib.nestedProperty(parentCont, containerStr).get() || {} :
        parentCont;
}

export default function colorScaleDefaults(parentContIn, parentContOut, layout, coerce, opts) {
    var prefix = opts.prefix;
    var cLetter = opts.cLetter;
    var inTrace = '_module' in parentContOut;
    var containerIn = npMaybe(parentContIn, prefix);
    var containerOut = npMaybe(parentContOut, prefix);
    var template = npMaybe(parentContOut._template || {}, prefix) || {};

    // colorScaleDefaults wrapper called if-ever we need to reset the colorscale
    // attributes for containers that were linked to invalid color axes
    var thisFn = function() {
        delete parentContIn.coloraxis;
        delete parentContOut.coloraxis;
        return colorScaleDefaults(parentContIn, parentContOut, layout, coerce, opts);
    };

    if(inTrace) {
        var colorAxes = layout._colorAxes || {};
        var colorAx = coerce(prefix + 'coloraxis');

        if(colorAx) {
            var colorbarVisuals = (
                traceIs(parentContOut, 'contour') &&
                Lib.nestedProperty(parentContOut, 'contours.coloring').get()
            ) || 'heatmap';

            var stash = colorAxes[colorAx];

            if(stash) {
                stash[2].push(thisFn);

                if(stash[0] !== colorbarVisuals) {
                    stash[0] = false;
                    Lib.warn([
                        'Ignoring coloraxis:', colorAx, 'setting',
                        'as it is linked to incompatible colorscales.'
                    ].join(' '));
                }
            } else {
                // stash:
                // - colorbar visual 'type'
                // - colorbar options to help in Colorbar.draw
                // - list of colorScaleDefaults wrapper functions
                colorAxes[colorAx] = [colorbarVisuals, parentContOut, [thisFn]];
            }
            return;
        }
    }

    var minIn = containerIn[cLetter + 'min'];
    var maxIn = containerIn[cLetter + 'max'];
    var validMinMax = isNumeric(minIn) && isNumeric(maxIn) && (minIn < maxIn);
    var auto = coerce(prefix + cLetter + 'auto', !validMinMax);

    if(auto) {
        coerce(prefix + cLetter + 'mid');
    } else {
        coerce(prefix + cLetter + 'min');
        coerce(prefix + cLetter + 'max');
    }

    // handles both the trace case (autocolorscale is false by default) and
    // the marker and marker.line case (autocolorscale is true by default)
    var sclIn = containerIn.colorscale;
    var sclTemplate = template.colorscale;
    var autoColorscaleDflt;
    if(sclIn !== undefined) autoColorscaleDflt = !isValidScale(sclIn);
    if(sclTemplate !== undefined) autoColorscaleDflt = !isValidScale(sclTemplate);
    coerce(prefix + 'autocolorscale', autoColorscaleDflt);

    coerce(prefix + 'colorscale');
    coerce(prefix + 'reversescale');

    if(prefix !== 'marker.line.') {
        // handles both the trace case where the dflt is listed in attributes and
        // the marker case where the dflt is determined by hasColorbar
        var showScaleDflt;
        if(prefix && inTrace) showScaleDflt = hasColorbar(containerIn);

        var showScale = coerce(prefix + 'showscale', showScaleDflt);
        if(showScale) {
            if(prefix && template) containerOut._template = template;
            colorbarDefaults(containerIn, containerOut, layout);
        }
    }
}
