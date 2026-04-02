import _draw from '../annotations/draw.js';
const { drawRaw } = _draw;
import project from '../../plots/gl3d/project.js';
const axLetters = ['x', 'y', 'z'];

export default function draw(scene: any) {
    const fullSceneLayout = scene.fullSceneLayout;
    const dataScale = scene.dataScale;
    const anns = fullSceneLayout.annotations;

    for(let i = 0; i < anns.length; i++) {
        const ann = anns[i];
        let annotationIsOffscreen = false;

        for(let j = 0; j < 3; j++) {
            const axLetter = axLetters[j];
            const pos = ann[axLetter];
            const ax = fullSceneLayout[axLetter + 'axis'];
            const posFraction = ax.r2fraction(pos);

            if(posFraction < 0 || posFraction > 1) {
                annotationIsOffscreen = true;
                break;
            }
        }

        if(annotationIsOffscreen) {
            scene.fullLayout._infolayer
                .select('.annotation-' + scene.id + '[data-index="' + i + '"]')
                .remove();
        } else {
            ann._pdata = project(scene.glplot.cameraParams, [
                fullSceneLayout.xaxis.r2l(ann.x) * dataScale[0],
                fullSceneLayout.yaxis.r2l(ann.y) * dataScale[1],
                fullSceneLayout.zaxis.r2l(ann.z) * dataScale[2]
            ]);

            drawRaw(scene.graphDiv, ann, i, scene.id, ann._xa, ann._ya);
        }
    }
}
