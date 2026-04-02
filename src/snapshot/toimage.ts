import { EventEmitter } from 'events';
import { _doPlot } from '../plot_api/plot_api.js';
import Lib from '../lib/index.js';
import helpers from './helpers.js';
import clonePlot from './cloneplot.js';
import toSVG from './tosvg.js';
import svgToImg from './svgtoimg.js';
import type { GraphDiv } from '../../types/core';

/**
 * @param {object} gd figure Object
 * @param {object} opts option object
 * @param opts.format 'jpeg' | 'png' | 'webp' | 'svg'
 */
function toImage(gd: GraphDiv, opts: any) {
    // first clone the GD so we can operate in a clean environment
    let ev = new EventEmitter();

    const clone = clonePlot(gd, {format: 'png'});
    const clonedGd: any = clone.gd;

    // put the cloned div somewhere off screen before attaching to DOM
    clonedGd.style.position = 'absolute';
    clonedGd.style.left = '-5000px';
    document.body.appendChild(clonedGd);

    function wait() {
        const delay = helpers.getDelay(clonedGd._fullLayout);

        setTimeout(function() {
            const svg = toSVG(clonedGd);

            const canvas = document.createElement('canvas');
            canvas.id = Lib.randstr();

            ev = svgToImg({
                format: opts.format,
                width: clonedGd._fullLayout.width,
                height: clonedGd._fullLayout.height,
                canvas: canvas,
                emitter: ev,
                svg: svg
            });

            ev.clean = function() {
                if(clonedGd) document.body.removeChild(clonedGd);
            };
        }, delay);
    }

    const redrawFunc = helpers.getRedrawFunc(clonedGd);

    _doPlot(clonedGd, clone.data, clone.layout, clone.config)
        .then(redrawFunc)
        .then(wait)
        .catch((err: any) => {
            ev.emit('error', err);
        });

    return ev;
}

export default toImage;
