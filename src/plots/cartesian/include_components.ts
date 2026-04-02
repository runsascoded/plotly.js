import { subplotsRegistry } from '../../registry.js';
import Lib from '../../lib/index.js';
import axisIds from './axis_ids.js';

export default function makeIncludeComponents(containerArrayName?: any): any {
    return function includeComponents(layoutIn?: any, layoutOut?: any) {
        const array = layoutIn[containerArrayName];
        if(!Array.isArray(array)) return;

        const Cartesian = subplotsRegistry.cartesian;
        const idRegex = Cartesian.idRegex;
        const subplots = layoutOut._subplots;
        const xaList = subplots.xaxis;
        const yaList = subplots.yaxis;
        const cartesianList = subplots.cartesian;
        const hasCartesian = layoutOut._has('cartesian');

        for(let i = 0; i < array.length; i++) {
            const itemi = array[i];
            if(!Lib.isPlainObject(itemi)) continue;

            // call cleanId because if xref, or yref has something appended
            // (e.g., ' domain') this will get removed.
            const xref = axisIds.cleanId(itemi.xref, 'x', false);
            const yref = axisIds.cleanId(itemi.yref, 'y', false);

            const hasXref = idRegex.x.test(xref);
            const hasYref = idRegex.y.test(yref);
            if(hasXref || hasYref) {
                if(!hasCartesian) Lib.pushUnique(layoutOut._basePlotModules, Cartesian);

                let newAxis = false;
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
