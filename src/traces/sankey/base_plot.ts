import type { FullLayout, FullTrace, GraphDiv } from '../../../types/core';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import { getModuleCalcData } from '../../plots/get_data.js';
import sankeyPlot from './plot.js';
import fxAttrs from '../../components/fx/layout_attributes.js';
import setCursor from '../../lib/setcursor.js';
import dragElement from '../../components/dragelement/index.js';
import _index from '../../components/selections/index.js';
const { prepSelect } = _index;
import Lib from '../../lib/index.js';
import Registry from '../../registry.js';

const SANKEY = 'sankey';

export const name = SANKEY;

export const baseLayoutAttrOverrides = overrideAll({
    hoverlabel: fxAttrs.hoverlabel
}, 'plot', 'nested');

export function plot(gd: GraphDiv): void {
    const calcData = getModuleCalcData(gd.calcdata, SANKEY)[0];
    sankeyPlot(gd, calcData);
    updateFx(gd);
}

export function clean(newFullData: FullTrace[], newFullLayout: FullLayout, oldFullData: FullTrace[], oldFullLayout: FullLayout) {
    const hadPlot = (oldFullLayout._has && oldFullLayout._has(SANKEY));
    const hasPlot = (newFullLayout._has && newFullLayout._has(SANKEY));

    if(hadPlot && !hasPlot) {
        oldFullLayout._paperdiv.selectAll('.sankey').remove();
        oldFullLayout._paperdiv.selectAll('.bgsankey').remove();
    }
}

export function updateFx(gd: GraphDiv): void {
    for(let i = 0; i < gd._fullData.length; i++) {
        subplotUpdateFx(gd, i);
    }
}

function subplotUpdateFx(gd: GraphDiv, index: number) {
    const trace = gd._fullData[index];
    const fullLayout = gd._fullLayout;

    const dragMode = fullLayout.dragmode;
    const cursor = fullLayout.dragmode === 'pan' ? 'move' : 'crosshair';
    const bgRect = trace._bgRect;
    if(!bgRect) return;

    if(dragMode === 'pan' || dragMode === 'zoom') return;

    setCursor(bgRect, cursor);

    const xaxis = {
        _id: 'x',
        c2p: Lib.identity,
        _offset: trace._sankey.translateX,
        _length: trace._sankey.width
    };
    const yaxis = {
        _id: 'y',
        c2p: Lib.identity,
        _offset: trace._sankey.translateY,
        _length: trace._sankey.height
    };

    // Note: dragOptions is needed to be declared for all dragmodes because
    // it's the object that holds persistent selection state.
    const dragOptions: Record<string, any> = {
        gd: gd,
        element: bgRect.node(),
        plotinfo: {
            id: index,
            xaxis: xaxis,
            yaxis: yaxis,
            fillRangeItems: Lib.noop
        },
        subplot: index,
        // create mock x/y axes for hover routine
        xaxes: [xaxis],
        yaxes: [yaxis],
        doneFnCompleted: function(selection: any) {
            const traceNow = gd._fullData[index];
            let newGroups;
            const oldGroups = traceNow.node.groups.slice();
            const newGroup: any[] = [];

            function findNode(pt: any) {
                const nodes = traceNow._sankey.graph.nodes;
                for(let i = 0; i < nodes.length; i++) {
                    if(nodes[i].pointNumber === pt) return nodes[i];
                }
            }

            for(let j = 0; j < selection.length; j++) {
                const node = findNode(selection[j].pointNumber);
                if(!node) continue;

                // If the node represents a group
                if(node.group) {
                    // Add all its children to the current selection
                    for(let k = 0; k < node.childrenNodes.length; k++) {
                        newGroup.push(node.childrenNodes[k].pointNumber);
                    }
                    // Flag group for removal from existing list of groups
                    oldGroups[node.pointNumber - traceNow.node._count] = false;
                } else {
                    newGroup.push(node.pointNumber);
                }
            }

            newGroups = oldGroups
                .filter(Boolean)
                .concat([newGroup]);

            Registry.call('_guiRestyle', gd, {
                'node.groups': [ newGroups ]
            }, index);
        }
    };

    dragOptions.prepFn = function(e: any, startX: any, startY: any) {
        prepSelect(e, startX, startY, dragOptions, dragMode);
    };

    dragElement.init(dragOptions);
}

export default { name, baseLayoutAttrOverrides, plot, clean, updateFx };
