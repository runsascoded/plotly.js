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

var GL3D = 'gl3d';
var SCENE = 'scene';

export var name = GL3D;
export var attr = SCENE;
export var idRoot = SCENE;
export var idRegex = Lib.counterRegex('scene');
export var attributes = _req0;
export var layoutAttributes = _req1;

export var baseLayoutAttrOverrides = overrideAll({
    hoverlabel: fxAttrs.hoverlabel
}, 'plot', 'nested');

export var supplyLayoutDefaults = _req2;

export var plot = function plot(gd) {
    var fullLayout = gd._fullLayout;
    var fullData = gd._fullData;
    var sceneIds = fullLayout._subplots[GL3D];

    for(var i = 0; i < sceneIds.length; i++) {
        var sceneId = sceneIds[i];
        var fullSceneData = getSubplotData(fullData, GL3D, sceneId);
        var sceneLayout = fullLayout[sceneId];
        var camera = sceneLayout.camera;
        var scene = sceneLayout._scene;

        if(!scene) {
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
};

export var clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var oldSceneKeys = oldFullLayout._subplots[GL3D] || [];

    for(var i = 0; i < oldSceneKeys.length; i++) {
        var oldSceneKey = oldSceneKeys[i];

        if(!newFullLayout[oldSceneKey] && !!oldFullLayout[oldSceneKey]._scene) {
            oldFullLayout[oldSceneKey]._scene.destroy();

            if(oldFullLayout._infolayer) {
                oldFullLayout._infolayer
                    .selectAll('.annotation-' + oldSceneKey)
                    .remove();
            }
        }
    }
};

export var toSVG = function(gd) {
    var fullLayout = gd._fullLayout;
    var sceneIds = fullLayout._subplots[GL3D];
    var size = fullLayout._size;

    for(var i = 0; i < sceneIds.length; i++) {
        var sceneLayout = fullLayout[sceneIds[i]];
        var domain = sceneLayout.domain;
        var scene = sceneLayout._scene;

        var imageData = scene.toImage('png');
        var image = fullLayout._glimages.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            x: size.l + size.w * domain.x[0],
            y: size.t + size.h * (1 - domain.y[1]),
            width: size.w * (domain.x[1] - domain.x[0]),
            height: size.h * (domain.y[1] - domain.y[0]),
            preserveAspectRatio: 'none'
        });

        scene.destroy();
    }
};

export var cleanId = function cleanId(id) {
    if(!id.match(/^scene[0-9]*$/)) return;

    var sceneNum = id.slice(5);
    if(sceneNum === '1') sceneNum = '';

    return SCENE + sceneNum;
};

export var updateFx = function(gd) {
    var fullLayout = gd._fullLayout;
    var subplotIds = fullLayout._subplots[GL3D];

    for(var i = 0; i < subplotIds.length; i++) {
        var subplotObj = fullLayout[subplotIds[i]]._scene;
        subplotObj.updateFx(fullLayout.dragmode, fullLayout.hovermode);
    }
};

export default { name, attr, idRoot, idRegex, attributes, layoutAttributes, baseLayoutAttrOverrides, supplyLayoutDefaults, plot, clean, toSVG, cleanId, updateFx };
