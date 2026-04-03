import Axes from '../../cartesian/axes.js';
import Lib from '../../../lib/index.js';
export default computeTickMarks;
const AXES_NAMES = ['xaxis', 'yaxis', 'zaxis'];
const centerPoint = [0, 0, 0];
function contourLevelsFromTicks(ticks) {
    const result = new Array(3);
    for (let i = 0; i < 3; ++i) {
        const tlevel = ticks[i];
        const clevel = new Array(tlevel.length);
        for (let j = 0; j < tlevel.length; ++j) {
            clevel[j] = tlevel[j].x;
        }
        result[i] = clevel;
    }
    return result;
}
function computeTickMarks(scene) {
    const axesOptions = scene.axesOptions;
    const glRange = scene.glplot.axesPixels;
    const sceneLayout = scene.fullSceneLayout;
    const ticks = [[], [], []];
    for (let i = 0; i < 3; ++i) {
        const axes = sceneLayout[AXES_NAMES[i]];
        axes._length = (glRange[i].hi - glRange[i].lo) *
            glRange[i].pixelsPerDataUnit / scene.dataScale[i];
        if (Math.abs(axes._length) === Infinity ||
            isNaN(axes._length)) {
            ticks[i] = [];
        }
        else {
            axes._input_range = axes.range.slice();
            axes.range[0] = (glRange[i].lo) / scene.dataScale[i];
            axes.range[1] = (glRange[i].hi) / scene.dataScale[i];
            axes._m = 1.0 / (scene.dataScale[i] * glRange[i].pixelsPerDataUnit);
            if (axes.range[0] === axes.range[1]) {
                axes.range[0] -= 1;
                axes.range[1] += 1;
            }
            // this is necessary to short-circuit the 'y' handling
            // in tickmode part of calcTicks... Treating all axes as 'y' in this case
            // running the tickmode here, then setting
            // automode to linear to get around the 2D handling in calcTicks.
            const tickModeCached = axes.tickmode;
            if (axes.tickmode === 'auto') {
                axes.tickmode = 'linear';
                const nticks = axes.nticks || Lib.constrain((axes._length / 40), 4, 9);
                Axes.autoTicks(axes, Math.abs(axes.range[1] - axes.range[0]) / nticks);
            }
            const dataTicks = Axes.calcTicks(axes, { msUTC: true });
            for (let j = 0; j < dataTicks.length; ++j) {
                dataTicks[j].x = dataTicks[j].x * scene.dataScale[i];
                if (axes.type === 'date') {
                    dataTicks[j].text =
                        dataTicks[j].text.replace(/\<br\>/g, ' ');
                }
            }
            ticks[i] = dataTicks;
            axes.tickmode = tickModeCached;
        }
    }
    axesOptions.ticks = ticks;
    // Calculate tick lengths dynamically
    for (let i = 0; i < 3; ++i) {
        centerPoint[i] = 0.5 * (scene.glplot.bounds[0][i] + scene.glplot.bounds[1][i]);
        for (let j = 0; j < 2; ++j) {
            axesOptions.bounds[j][i] = scene.glplot.bounds[j][i];
        }
    }
    scene.contourLevels = contourLevelsFromTicks(ticks);
}
