import _draw from '../annotations/draw.js';
const { drawRaw } = _draw;
import project from '../../plots/gl3d/project.js';
var axLetters = ['x', 'y', 'z'];

export default function draw(scene: any) {
    var fullSceneLayout = scene.fullSceneLayout;
    var dataScale = scene.dataScale;
    var anns = fullSceneLayout.annotations;

    for(var i = 0; i < anns.length; i++) {
        var ann = anns[i];
        var annotationIsOffscreen = false;

        for(var j = 0; j < 3; j++) {
            var axLetter = axLetters[j];
            var pos = ann[axLetter];
            var ax = fullSceneLayout[axLetter + 'axis'];
            var posFraction = ax.r2fraction(pos);

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
