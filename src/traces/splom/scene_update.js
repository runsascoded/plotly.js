import Lib from '../../lib/index.js';
export default function sceneUpdate(gd, trace) {
    const fullLayout = gd._fullLayout;
    const uid = trace.uid;
    // must place ref to 'scene' in fullLayout, so that:
    // - it can be relinked properly on updates
    // - it can be destroyed properly when needed
    let splomScenes = fullLayout._splomScenes;
    if (!splomScenes)
        splomScenes = fullLayout._splomScenes = {};
    const reset = {
        dirty: true,
        selectBatch: [],
        unselectBatch: []
    };
    const first = {
        matrix: false,
        selectBatch: [],
        unselectBatch: []
    };
    let scene = splomScenes[trace.uid];
    if (!scene) {
        scene = splomScenes[uid] = Lib.extendFlat({}, reset, first);
        scene.draw = function draw() {
            if (scene.matrix && scene.matrix.draw) {
                if (scene.selectBatch.length || scene.unselectBatch.length) {
                    scene.matrix.draw(scene.unselectBatch, scene.selectBatch);
                }
                else {
                    scene.matrix.draw();
                }
            }
            scene.dirty = false;
        };
        // remove scene resources
        scene.destroy = function destroy() {
            if (scene.matrix && scene.matrix.destroy) {
                scene.matrix.destroy();
            }
            scene.matrixOptions = null;
            scene.selectBatch = null;
            scene.unselectBatch = null;
            scene = null;
        };
    }
    // In case if we have scene from the last calc - reset data
    if (!scene.dirty) {
        Lib.extendFlat(scene, reset);
    }
    return scene;
}
