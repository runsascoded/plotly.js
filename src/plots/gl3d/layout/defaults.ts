import Lib from '../../../lib/index.js';
import Color from '../../../components/color/index.js';
import Registry from '../../../registry.js';
import handleSubplotDefaults from '../../subplot_defaults.js';
import supplyGl3dAxisLayoutDefaults from './axis_defaults.js';
import layoutAttributes from './layout_attributes.js';
import { getSubplotData } from '../../get_data.js';
import type { FullLayout, FullTrace } from '../../../../types/core';

const GL3D = 'gl3d';

export default function supplyLayoutDefaults(layoutIn: any, layoutOut: FullLayout, fullData: FullTrace[]) {
    const hasNon3D = layoutOut._basePlotModules.length > 1;

    // some layout-wide attribute are used in all scenes
    // if 3D is the only visible plot type
    function getDfltFromLayout(attr: any) {
        if(hasNon3D) return;

        const isValid = Lib.validate(layoutIn[attr], (layoutAttributes as any)[attr]);
        if(isValid) return layoutIn[attr];
    }

    handleSubplotDefaults(layoutIn, layoutOut, fullData, {
        type: GL3D,
        attributes: layoutAttributes,
        handleDefaults: handleGl3dDefaults,
        fullLayout: layoutOut,
        font: layoutOut.font,
        fullData: fullData,
        getDfltFromLayout: getDfltFromLayout,
        autotypenumbersDflt: layoutOut.autotypenumbers,
        paper_bgcolor: layoutOut.paper_bgcolor,
        calendar: layoutOut.calendar
    });
}

function handleGl3dDefaults(sceneLayoutIn: any, sceneLayoutOut: any, coerce: any, opts: any) {
    /*
     * Scene numbering proceeds as follows
     * scene
     * scene2
     * scene3
     *
     * and d.scene will be undefined or some number or number string
     *
     * Also write back a blank scene object to user layout so that some
     * attributes like aspectratio can be written back dynamically.
     */

    const bgcolor = coerce('bgcolor');
    const bgColorCombined = Color.combine(bgcolor, opts.paper_bgcolor);

    const cameraKeys = ['up', 'center', 'eye'];

    for(let j = 0; j < cameraKeys.length; j++) {
        coerce('camera.' + cameraKeys[j] + '.x');
        coerce('camera.' + cameraKeys[j] + '.y');
        coerce('camera.' + cameraKeys[j] + '.z');
    }

    coerce('camera.projection.type');

    /*
     * coerce to positive number (min 0) but also do not accept 0 (>0 not >=0)
     * note that 0's go false with the !! call
     */
    const hasAspect = !!coerce('aspectratio.x') &&
                    !!coerce('aspectratio.y') &&
                    !!coerce('aspectratio.z');

    const defaultAspectMode = hasAspect ? 'manual' : 'auto';
    const aspectMode = coerce('aspectmode', defaultAspectMode);

    /*
     * We need aspectratio object in all the Layouts as it is dynamically set
     * in the calculation steps, ie, we cant set the correct data now, it happens later.
     * We must also account for the case the user sends bad ratio data with 'manual' set
     * for the mode. In this case we must force change it here as the default coerce
     * misses it above.
     */
    if(!hasAspect) {
        sceneLayoutIn.aspectratio = sceneLayoutOut.aspectratio = {x: 1, y: 1, z: 1};

        if(aspectMode === 'manual') sceneLayoutOut.aspectmode = 'auto';

        /*
         * kind of like autorange - we need the calculated aspectmode back in
         * the input layout or relayout can cause problems later
         */
        sceneLayoutIn.aspectmode = sceneLayoutOut.aspectmode;
    }

    const fullGl3dData = getSubplotData(opts.fullData, GL3D, opts.id);

    supplyGl3dAxisLayoutDefaults(sceneLayoutIn, sceneLayoutOut, {
        font: opts.font,
        scene: opts.id,
        data: fullGl3dData,
        bgColor: bgColorCombined,
        calendar: opts.calendar,
        autotypenumbersDflt: opts.autotypenumbersDflt,
        fullLayout: opts.fullLayout
    });

    Registry.getComponentMethod('annotations3d', 'handleDefaults')(
        sceneLayoutIn, sceneLayoutOut, opts
    );

    let dragmode = opts.getDfltFromLayout('dragmode');

    if(dragmode !== false) {
        if(!dragmode) {
            dragmode = 'orbit';

            if(sceneLayoutIn.camera &&
                sceneLayoutIn.camera.up) {
                const x = sceneLayoutIn.camera.up.x;
                const y = sceneLayoutIn.camera.up.y;
                const z = sceneLayoutIn.camera.up.z;

                if(z !== 0) {
                    if(!x || !y || !z) {
                        dragmode = 'turntable';
                    } else if(z / Math.sqrt(x * x + y * y + z * z) > 0.999) {
                        dragmode = 'turntable';
                    }
                }
            } else {
                dragmode = 'turntable';
            }
        }
    }

    coerce('dragmode', dragmode);
    coerce('hovermode', opts.getDfltFromLayout('hovermode'));
}
