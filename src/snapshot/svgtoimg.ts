import Lib from '../lib/index.js';
import { EventEmitter } from 'events';
import helpers from './helpers.js';

function svgToImg(opts: any) {
    const ev = opts.emitter || new EventEmitter();

    const promise = new Promise(function(resolve, reject) {
        const Image = window.Image;
        const svg = opts.svg;
        const format = opts.format || 'png';

        const canvas = opts.canvas;
        const scale = opts.scale || 1;
        const w0 = opts.width || 300;
        const h0 = opts.height || 150;
        const w1 = scale * w0;
        const h1 = scale * h0;

        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        const img = new Image();
        let svgBlob, url;

        if(format === 'svg' || Lib.isSafari()) {
            url = helpers.encodeSVG(svg);
        } else {
            svgBlob = helpers.createBlob(svg, 'svg');
            url = helpers.createObjectURL(svgBlob);
        }

        canvas.width = w1;
        canvas.height = h1;

        img.onload = function() {
            let imgData;

            svgBlob = null;
            helpers.revokeObjectURL(url);

            // don't need to draw to canvas if svg
            //  save some time and also avoid failure on IE
            if(format !== 'svg') {
                ctx.drawImage(img, 0, 0, w1, h1);
            }

            switch(format) {
                case 'jpeg':
                    imgData = canvas.toDataURL('image/jpeg');
                    break;
                case 'png':
                    imgData = canvas.toDataURL('image/png');
                    break;
                case 'webp':
                    imgData = canvas.toDataURL('image/webp');
                    break;
                case 'svg':
                    imgData = url;
                    break;
                default:
                    const errorMsg = 'Image format is not jpeg, png, svg or webp.';
                    reject(new Error(errorMsg));
                    // eventually remove the ev
                    //  in favor of promises
                    if(!opts.promise) {
                        return ev.emit('error', errorMsg);
                    }
            }
            resolve(imgData);
            // eventually remove the ev
            //  in favor of promises
            if(!opts.promise) {
                ev.emit('success', imgData);
            }
        };

        img.onerror = function(err) {
            svgBlob = null;
            helpers.revokeObjectURL(url);

            reject(err);
            // eventually remove the ev
            //  in favor of promises
            if(!opts.promise) {
                return ev.emit('error', err);
            }
        };

        img.src = url;
    });

    // temporary for backward compatibility
    //  move to only Promise in 2.0.0
    //  and eliminate the EventEmitter
    if(opts.promise) {
        return promise;
    }

    return ev;
}

export default svgToImg;
