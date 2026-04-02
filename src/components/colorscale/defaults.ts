import isNumeric from 'fast-isnumeric';
import { nestedProperty, warn } from '../../lib/index.js';
import hasColorbar from '../colorbar/has_colorbar.js';
import colorbarDefaults from '../colorbar/defaults.js';
import _scales from './scales.js';
const { isValid: isValidScale } = _scales;
import { traceIs } from '../../registry.js';

function npMaybe(parentCont: any, prefix: string): any {
    const containerStr = prefix.slice(0, prefix.length - 1);
    return prefix ?
        nestedProperty(parentCont, containerStr).get() || {} :
        parentCont;
}

export default function colorScaleDefaults(parentContIn: any, parentContOut: any, layout: any, coerce: any, opts: any): void {
    const prefix = opts.prefix;
    const cLetter = opts.cLetter;
    const inTrace = '_module' in parentContOut;
    const containerIn = npMaybe(parentContIn, prefix);
    const containerOut = npMaybe(parentContOut, prefix);
    const template = npMaybe(parentContOut._template || {}, prefix) || {};

    const thisFn = (): any => {
        delete parentContIn.coloraxis;
        delete parentContOut.coloraxis;
        return colorScaleDefaults(parentContIn, parentContOut, layout, coerce, opts);
    };

    if(inTrace) {
        const colorAxes = layout._colorAxes || {};
        const colorAx = coerce(prefix + 'coloraxis');

        if(colorAx) {
            const colorbarVisuals = (
                traceIs(parentContOut, 'contour') &&
                nestedProperty(parentContOut, 'contours.coloring').get()
            ) || 'heatmap';

            const stash = colorAxes[colorAx];

            if(stash) {
                stash[2].push(thisFn);

                if(stash[0] !== colorbarVisuals) {
                    stash[0] = false;
                    warn([
                        'Ignoring coloraxis:', colorAx, 'setting',
                        'as it is linked to incompatible colorscales.'
                    ].join(' '));
                }
            } else {
                colorAxes[colorAx] = [colorbarVisuals, parentContOut, [thisFn]];
            }
            return;
        }
    }

    const minIn = containerIn[cLetter + 'min'];
    const maxIn = containerIn[cLetter + 'max'];
    const validMinMax = isNumeric(minIn) && isNumeric(maxIn) && (minIn < maxIn);
    const auto = coerce(prefix + cLetter + 'auto', !validMinMax);

    if(auto) {
        coerce(prefix + cLetter + 'mid');
    } else {
        coerce(prefix + cLetter + 'min');
        coerce(prefix + cLetter + 'max');
    }

    const sclIn = containerIn.colorscale;
    const sclTemplate = template.colorscale;
    let autoColorscaleDflt;
    if(sclIn !== undefined) autoColorscaleDflt = !isValidScale(sclIn);
    if(sclTemplate !== undefined) autoColorscaleDflt = !isValidScale(sclTemplate);
    coerce(prefix + 'autocolorscale', autoColorscaleDflt);

    coerce(prefix + 'colorscale');
    coerce(prefix + 'reversescale');

    if(prefix !== 'marker.line.') {
        let showScaleDflt;
        if(prefix && inTrace) showScaleDflt = hasColorbar(containerIn);

        const showScale = coerce(prefix + 'showscale', showScaleDflt);
        if(showScale) {
            if(prefix && template) containerOut._template = template;
            colorbarDefaults(containerIn, containerOut, layout);
        }
    }
}
