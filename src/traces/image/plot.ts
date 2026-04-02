import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
import constants from './constants.js';
import supportsPixelatedImage from '../../lib/supports_pixelated_image.js';
import { STYLE as PIXELATED_IMAGE_STYLE } from '../../constants/pixelated_image.js';
const strTranslate = Lib.strTranslate;

export default function plot(gd: GraphDiv, plotinfo: any, cdimage: any[], imageLayer: any) {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    const supportsPixelated = !gd._context._exportedPlot && supportsPixelatedImage();

    Lib.makeTraceGroups(imageLayer, cdimage, 'im').each(function(cd) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;
        const realImage = (
            ((trace.zsmooth === 'fast') || (trace.zsmooth === false && supportsPixelated)) &&
            !trace._hasZ && trace._hasSource && xa.type === 'linear' && ya.type === 'linear'
        );
        trace._realImage = realImage;

        const z = cd0.z;
        const x0 = cd0.x0;
        const y0 = cd0.y0;
        const w = cd0.w;
        const h = cd0.h;
        const dx = trace.dx;
        const dy = trace.dy;

        let left, right, temp, top, bottom, i;
        // in case of log of a negative
        i = 0;
        while(left === undefined && i < w) {
            left = xa.c2p(x0 + i * dx);
            i++;
        }
        i = w;
        while(right === undefined && i > 0) {
            right = xa.c2p(x0 + i * dx);
            i--;
        }
        i = 0;
        while(top === undefined && i < h) {
            top = ya.c2p(y0 + i * dy);
            i++;
        }
        i = h;
        while(bottom === undefined && i > 0) {
            bottom = ya.c2p(y0 + i * dy);
            i--;
        }

        if(right < left) {
            temp = right;
            right = left;
            left = temp;
        }

        if(bottom < top) {
            temp = top;
            top = bottom;
            bottom = temp;
        }

        // Reduce image size when zoomed in to save memory
        if(!realImage) {
            const extra = 0.5; // half the axis size
            left = Math.max(-extra * xa._length, left);
            right = Math.min((1 + extra) * xa._length, right);
            top = Math.max(-extra * ya._length, top);
            bottom = Math.min((1 + extra) * ya._length, bottom);
        }

        const imageWidth = Math.round(right - left);
        const imageHeight = Math.round(bottom - top);

        // if image is entirely off-screen, don't even draw it
        const isOffScreen = (imageWidth <= 0 || imageHeight <= 0);
        if(isOffScreen) {
            const noImage = plotGroup.selectAll('image').data([]);
            noImage.exit().remove();
            return;
        }

        // Create a new canvas and draw magnified pixels on it
        function drawMagnifiedPixelsOnCanvas(readPixel) {
            const canvas = document.createElement('canvas');
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            const context = canvas.getContext('2d', {willReadFrequently: true});

            const ipx = function(i) {return Lib.constrain(Math.round(xa.c2p(x0 + i * dx) - left), 0, imageWidth);};
            const jpx = function(j) {return Lib.constrain(Math.round(ya.c2p(y0 + j * dy) - top), 0, imageHeight);};

            const cr = constants.colormodel[trace.colormodel];
            const colormodel = (cr.colormodel || trace.colormodel);
            const fmt = cr.fmt;
            let c;
            for(i = 0; i < cd0.w; i++) {
                const ipx0 = ipx(i); const ipx1 = ipx(i + 1);
                if(ipx1 === ipx0 || isNaN(ipx1) || isNaN(ipx0)) continue;
                for(let j = 0; j < cd0.h; j++) {
                    const jpx0 = jpx(j); const jpx1 = jpx(j + 1);
                    if(jpx1 === jpx0 || isNaN(jpx1) || isNaN(jpx0) || !readPixel(i, j)) continue;
                    c = trace._scaler(readPixel(i, j));
                    if(c) {
                        context.fillStyle = colormodel + '(' + fmt(c).join(',') + ')';
                    } else {
                        // Return a transparent pixel
                        context.fillStyle = 'rgba(0,0,0,0)';
                    }
                    context.fillRect(ipx0, jpx0, ipx1 - ipx0, jpx1 - jpx0);
                }
            }

            return canvas;
        }

        const image3 = plotGroup.selectAll('image')
            .data([cd]);

        image3.enter().append('svg:image').attr({
            xmlns: xmlnsNamespaces.svg,
            preserveAspectRatio: 'none'
        });

        image3.exit().remove();

        let style = (trace.zsmooth === false) ? PIXELATED_IMAGE_STYLE : '';

        if(realImage) {
            const xRange = Lib.simpleMap(xa.range, xa.r2l);
            const yRange = Lib.simpleMap(ya.range, ya.r2l);

            const flipX = xRange[1] < xRange[0];
            const flipY = yRange[1] > yRange[0];
            if(flipX || flipY) {
                const tx = left + imageWidth / 2;
                const ty = top + imageHeight / 2;
                style += 'transform:' +
                    strTranslate(tx + 'px', ty + 'px') +
                    'scale(' + (flipX ? -1 : 1) + ',' + (flipY ? -1 : 1) + ')' +
                    strTranslate(-tx + 'px', -ty + 'px') + ';';
            }
        }
        image3.attr('style', style);

        const p = new Promise<void>(function(resolve) {
            if(trace._hasZ) {
                resolve();
            } else if(trace._hasSource) {
                // Check if canvas already exists and has the right data
                if(
                    trace._canvas &&
                    trace._canvas.el.width === w &&
                    trace._canvas.el.height === h &&
                    trace._canvas.source === trace.source
                ) {
                    resolve();
                } else {
                    // Create a canvas and transfer image onto it to access pixel information
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const context = canvas.getContext('2d', {willReadFrequently: true});

                    trace._image = trace._image || new Image();
                    const image = trace._image;
                    image.onload = function() {
                        context.drawImage(image, 0, 0);
                        trace._canvas = {
                            el: canvas,
                            source: trace.source
                        };
                        resolve();
                    };
                    image.setAttribute('src', trace.source);
                }
            }
        })
        .then(function() {
            let href, canvas;
            if(trace._hasZ) {
                canvas = drawMagnifiedPixelsOnCanvas(function(i, j) {
                    let _z = z[j][i];
                    if(Lib.isTypedArray(_z)) _z = Array.from(_z);
                    return _z;
                });
                href = canvas.toDataURL('image/png');
            } else if(trace._hasSource) {
                if(realImage) {
                    href = trace.source;
                } else {
                    const context = trace._canvas.el.getContext('2d', {willReadFrequently: true});
                    const data = context.getImageData(0, 0, w, h).data;
                    canvas = drawMagnifiedPixelsOnCanvas(function(i, j) {
                        const index = 4 * (j * w + i);
                        return [
                            data[index],
                            data[index + 1],
                            data[index + 2],
                            data[index + 3]
                        ];
                    });
                    href = canvas.toDataURL('image/png');
                }
            }

            image3.attr({
                'xlink:href': href,
                height: imageHeight,
                width: imageWidth,
                x: left,
                y: top
            });
        });

        gd._promises.push(p);
    });
}
