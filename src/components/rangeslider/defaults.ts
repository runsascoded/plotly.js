import Lib from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import axisIds from '../../plots/cartesian/axis_ids.js';
import attributes from './attributes.js';
import oppAxisAttrs from './oppaxis_attributes.js';

export default function handleDefaults(layoutIn: any, layoutOut: any, axName: any) {
    var axIn = layoutIn[axName];
    var axOut = layoutOut[axName];

    if(!(axIn.rangeslider || layoutOut._requestRangeslider[axOut._id])) return;

    // not super proud of this (maybe store _ in axis object instead
    if(!Lib.isPlainObject(axIn.rangeslider)) {
        axIn.rangeslider = {};
    }

    var containerIn = axIn.rangeslider;
    var containerOut = Template.newContainer(axOut, 'rangeslider');

    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(containerIn, containerOut, attributes, attr, dflt);
    }

    var rangeContainerIn, rangeContainerOut;
    function coerceRange(attr: any, dflt: any) {
        return Lib.coerce(rangeContainerIn, rangeContainerOut, oppAxisAttrs, attr, dflt);
    }

    var visible = coerce('visible');
    if(!visible) return;

    coerce('bgcolor', layoutOut.plot_bgcolor);
    coerce('bordercolor');
    coerce('borderwidth');
    coerce('thickness');

    coerce('autorange', !axOut.isValidRange(containerIn.range));
    coerce('range');

    var subplots = layoutOut._subplots;
    if(subplots) {
        var yIds = subplots.cartesian
            .filter(function(subplotId: any) {
                return subplotId.slice(0, Math.max(0, subplotId.indexOf('y'))) === axisIds.name2id(axName);
            })
            .map(function(subplotId: any) {
                return subplotId.slice(subplotId.indexOf('y'), subplotId.length);
            });
        var yNames = Lib.simpleMap(yIds, axisIds.id2name);
        for(var i = 0; i < yNames.length; i++) {
            var yName = yNames[i];

            rangeContainerIn = containerIn[yName] || {};
            rangeContainerOut = Template.newContainer(containerOut, yName, 'yaxis');

            var yAxOut = layoutOut[yName];

            var rangemodeDflt;
            if(rangeContainerIn.range && yAxOut.isValidRange(rangeContainerIn.range)) {
                rangemodeDflt = 'fixed';
            }

            var rangeMode = coerceRange('rangemode', rangemodeDflt);
            if(rangeMode !== 'match') {
                coerceRange('range', yAxOut.range.slice());
            }
        }
    }

    // to map back range slider (auto) range
    containerOut._input = containerIn;
}
