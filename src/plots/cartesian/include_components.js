import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import axisIds from './axis_ids.js';

export default function makeIncludeComponents(containerArrayName) {
    return function includeComponents(layoutIn, layoutOut) {
        var array = layoutIn[containerArrayName];
        if(!Array.isArray(array)) return;

        var Cartesian = Registry.subplotsRegistry.cartesian;
        var idRegex = Cartesian.idRegex;
        var subplots = layoutOut._subplots;
        var xaList = subplots.xaxis;
        var yaList = subplots.yaxis;
        var cartesianList = subplots.cartesian;
        var hasCartesian = layoutOut._has('cartesian');

        for(var i = 0; i < array.length; i++) {
            var itemi = array[i];
            if(!Lib.isPlainObject(itemi)) continue;

            // call cleanId because if xref, or yref has something appended
            // (e.g., ' domain') this will get removed.
            var xref = axisIds.cleanId(itemi.xref, 'x', false);
            var yref = axisIds.cleanId(itemi.yref, 'y', false);

            var hasXref = idRegex.x.test(xref);
            var hasYref = idRegex.y.test(yref);
            if(hasXref || hasYref) {
                if(!hasCartesian) Lib.pushUnique(layoutOut._basePlotModules, Cartesian);

                var newAxis = false;
                if(hasXref && xaList.indexOf(xref) === -1) {
                    xaList.push(xref);
                    newAxis = true;
                }
                if(hasYref && yaList.indexOf(yref) === -1) {
                    yaList.push(yref);
                    newAxis = true;
                }

                /*
                 * Notice the logic here: only add a subplot for a component if
                 * it's referencing both x and y axes AND it's creating a new axis
                 * so for example if your plot already has xy and x2y2, an annotation
                 * on x2y or xy2 will not create a new subplot.
                 */
                if(newAxis && hasXref && hasYref) {
                    cartesianList.push(xref + yref);
                }
            }
        }
    };
}
