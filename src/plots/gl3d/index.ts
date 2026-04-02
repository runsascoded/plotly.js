import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import fxAttrs from '../../components/fx/layout_attributes.js';
import Scene from './scene.js';
import { getSubplotData } from '../get_data.js';
import Lib from '../../lib/index.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
import _req0 from './layout/attributes.js';
import _req1 from './layout/layout_attributes.js';
import _req2 from './layout/defaults.js';
import type { GraphDiv } from '../../../types/core';

const GL3D = 'gl3d';
const SCENE = 'scene';

export const name = GL3D;
export const attr = SCENE;
export const idRoot = SCENE;
export const idRegex = Lib.counterRegex('scene');
export const attributes = _req0;
export const layoutAttributes = _req1;

export const baseLayoutAttrOverrides = overrideAll({
    hoverlabel: fxAttrs.hoverlabel
}, 'plot', 'nested');

export const supplyLayoutDefaults = _req2;

export function plot(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const fullData = gd._fullData;
    const sceneIds = fullLayout._subplots[GL3D];

    for(let i = 0; i < sceneIds.length; i++) {
        const sceneId = sceneIds[i];
        const fullSceneData = getSubplotData(fullData, GL3D, sceneId);
        const sceneLayout = fullLayout[sceneId];
        const camera = sceneLayout.camera;
        let scene = sceneLayout._scene;

        if(!scene) {
            // @ts-ignore TS7009
            scene = new Scene({
                id: sceneId,
                graphDiv: gd,
                container: gd.querySelector('.gl-container'),
                staticPlot: gd._context.staticPlot,
                plotGlPixelRatio: gd._context.plotGlPixelRatio,
                camera: camera
            },
                fullLayout
            );

            // set ref to Scene instance
            sceneLayout._scene = scene;
        }

        // save 'initial' camera view settings for modebar button
        if(!scene.viewInitial) {
            scene.viewInitial = {
                up: {
                    x: camera.up.x,
                    y: camera.up.y,
                    z: camera.up.z
                },
                eye: {
                    x: camera.eye.x,
                    y: camera.eye.y,
                    z: camera.eye.z
                },
                center: {
                    x: camera.center.x,
                    y: camera.center.y,
                    z: camera.center.z
                }
            };
        }

        scene.plot(fullSceneData, fullLayout, gd.layout);
    }
}

export function clean(newFullData: any, newFullLayout: any, oldFullData: any, oldFullLayout: any) {
    const oldSceneKeys = oldFullLayout._subplots[GL3D] || [];

    for(let i = 0; i < oldSceneKeys.length; i++) {
        const oldSceneKey = oldSceneKeys[i];

        if(!newFullLayout[oldSceneKey] && !!oldFullLayout[oldSceneKey]._scene) {
            oldFullLayout[oldSceneKey]._scene.destroy();

            if(oldFullLayout._infolayer) {
                oldFullLayout._infolayer
                    .selectAll('.annotation-' + oldSceneKey)
                    .remove();
            }
        }
    }
}

export function toSVG(gd: any) {
    const fullLayout = gd._fullLayout;
    const sceneIds = fullLayout._subplots[GL3D];
    const size = fullLayout._size;

    for(let i = 0; i < sceneIds.length; i++) {
        const sceneLayout = fullLayout[sceneIds[i]];
        const domain = sceneLayout.domain;
        const scene = sceneLayout._scene;

        const imageData = scene.toImage('png');
        const image = fullLayout._glimages.append('svg:image');

        image
            .attr('xmlns', xmlnsNamespaces.svg)
            .attr('xlink:href', imageData)
            .attr('x', size.l + size.w * domain.x[0])
            .attr('y', size.t + size.h * (1 - domain.y[1]))
            .attr('width', size.w * (domain.x[1] - domain.x[0]))
            .attr('height', size.h * (domain.y[1] - domain.y[0]))
            .attr('preserveAspectRatio', 'none');

        scene.destroy();
    }
}

export function cleanId(id: any) {
    if(!id.match(/^scene[0-9]*$/)) return;

    let sceneNum = id.slice(5);
    if(sceneNum === '1') sceneNum = '';

    return SCENE + sceneNum;
}

export function updateFx(gd: any) {
    const fullLayout = gd._fullLayout;
    const subplotIds = fullLayout._subplots[GL3D];

    for(let i = 0; i < subplotIds.length; i++) {
        const subplotObj = fullLayout[subplotIds[i]]._scene;
        subplotObj.updateFx(fullLayout.dragmode, fullLayout.hovermode);
    }
}

export default { name, attr, idRoot, idRegex, attributes, layoutAttributes, baseLayoutAttrOverrides, supplyLayoutDefaults, plot, clean, toSVG, cleanId, updateFx };
