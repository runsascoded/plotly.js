import { nestedProperty } from '../../lib/index.js';
import _helpers from './helpers.js';
const { hasColorscale, extractOpts } = _helpers;

export default function crossTraceDefaults(fullData, fullLayout) {
    function replace(cont, k) {
        var val = cont['_' + k];
        if(val !== undefined) {
            cont[k] = val;
        }
    }

    function relinkColorAttrs(outerCont, cbOpt) {
        var cont = cbOpt.container ?
            nestedProperty(outerCont, cbOpt.container).get() :
            outerCont;

        if(cont) {
            if(cont.coloraxis) {
                // stash ref to color axis
                cont._colorAx = fullLayout[cont.coloraxis];
            } else {
                var cOpts = extractOpts(cont);
                var isAuto = cOpts.auto;

                if(isAuto || cOpts.min === undefined) {
                    replace(cont, cbOpt.min);
                }
                if(isAuto || cOpts.max === undefined) {
                    replace(cont, cbOpt.max);
                }
                if(cOpts.autocolorscale) {
                    replace(cont, 'colorscale');
                }
            }
        }
    }

    for(var i = 0; i < fullData.length; i++) {
        var trace = fullData[i];
        var cbOpts = trace._module.colorbar;

        if(cbOpts) {
            if(Array.isArray(cbOpts)) {
                for(var j = 0; j < cbOpts.length; j++) {
                    relinkColorAttrs(trace, cbOpts[j]);
                }
            } else {
                relinkColorAttrs(trace, cbOpts);
            }
        }

        if(hasColorscale(trace, 'marker.line')) {
            relinkColorAttrs(trace, {
                container: 'marker.line',
                min: 'cmin',
                max: 'cmax'
            });
        }
    }

    for(var k in fullLayout._colorAxes) {
        relinkColorAttrs(fullLayout[k], {min: 'cmin', max: 'cmax'});
    }
}
