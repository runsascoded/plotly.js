import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { setClipUrl } from '../drawing/index.js';
import Axes from '../../plots/cartesian/axes.js';
import axisIds from '../../plots/cartesian/axis_ids.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';

export default function draw(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const imageDataAbove: any[] = [];
    const imageDataSubplot: any = {};
    const imageDataBelow: any[] = [];
    let subplot;
    let i;

    // Sort into top, subplot, and bottom layers
    for(i = 0; i < fullLayout.images!.length; i++) {
        const img = fullLayout.images![i];

        if(img.visible) {
            if(img.layer === 'below' && img.xref !== 'paper' && img.yref !== 'paper') {
                subplot = axisIds.ref2id(img.xref) + axisIds.ref2id(img.yref);

                const plotinfo = fullLayout._plots[subplot];

                if(!plotinfo) {
                    // Fall back to _imageLowerLayer in case the requested subplot doesn't exist.
                    // This can happen if you reference the image to an x / y axis combination
                    // that doesn't have any data on it (and layer is below)
                    imageDataBelow.push(img);
                    continue;
                }

                if(plotinfo.mainplot) {
                    subplot = plotinfo.mainplot.id;
                }

                if(!imageDataSubplot[subplot]) {
                    imageDataSubplot[subplot] = [];
                }
                imageDataSubplot[subplot].push(img);
            } else if(img.layer === 'above') {
                imageDataAbove.push(img);
            } else {
                imageDataBelow.push(img);
            }
        }
    }

    const anchors = {
        x: {
            left: { sizing: 'xMin', offset: 0 },
            center: { sizing: 'xMid', offset: -1 / 2 },
            right: { sizing: 'xMax', offset: -1 }
        },
        y: {
            top: { sizing: 'YMin', offset: 0 },
            middle: { sizing: 'YMid', offset: -1 / 2 },
            bottom: { sizing: 'YMax', offset: -1 }
        }
    };

    // Images must be converted to dataURL's for exporting.
    function setImage(this: any, d: any) {
        const thisImage = select(this);

        if(this._imgSrc === d.source) {
            return;
        }

        thisImage.attr('xmlns', xmlnsNamespaces.svg);

        if(!gd._context.staticPlot || (d.source && d.source.slice(0, 5) === 'data:')) {
            thisImage.attr('xlink:href', d.source);
            this._imgSrc = d.source;
        } else {
            const imagePromise: Promise<void> = new Promise(function(this: any, resolve: any) {
                const img = new Image();
                this.img = img;

                // If not set, a `tainted canvas` error is thrown
                img.setAttribute('crossOrigin', 'anonymous');
                img.onerror = errorHandler;
                img.onload = function(this: any) {
                    const canvas = document.createElement('canvas');
                    canvas.width = this.width;
                    canvas.height = this.height;

                    const ctx = canvas.getContext('2d', {willReadFrequently: true});
                    ctx!.drawImage(this as any, 0, 0);

                    const dataURL = canvas.toDataURL('image/png');

                    thisImage.attr('xlink:href', dataURL);

                    // resolve promise in onload handler instead of on 'load' to support IE11
                    // see https://github.com/plotly/plotly.js/issues/1685
                    // for more details
                    resolve();
                };

                thisImage.on('error', errorHandler);

                img.src = d.source;
                this._imgSrc = d.source;

                function errorHandler(this: any) {
                    thisImage.remove();
                    resolve();
                }
            }.bind(this));

            gd._promises.push(imagePromise);
        }
    }

    function applyAttributes(this: any, d: any) {
        const thisImage = select(this);

        // Axes if specified
        const xa = Axes.getFromId(gd, d.xref);
        const ya = Axes.getFromId(gd, d.yref);
        const xIsDomain = Axes.getRefType(d.xref) === 'domain';
        const yIsDomain = Axes.getRefType(d.yref) === 'domain';

        const size = fullLayout._size;
        let width, height;
        if(xa !== undefined) {
            width = ((typeof(d.xref) === 'string') && xIsDomain) ?
                xa._length * d.sizex :
                Math.abs(xa.l2p(d.sizex) - xa.l2p(0));
        } else {
            width = d.sizex * size.w;
        }
        if(ya !== undefined) {
            height = ((typeof(d.yref) === 'string') && yIsDomain) ?
                ya._length * d.sizey :
                Math.abs(ya.l2p(d.sizey) - ya.l2p(0));
        } else {
            height = d.sizey * size.h;
        }

        // Offsets for anchor positioning
        const xOffset = width * (anchors.x as any)[d.xanchor].offset;
        const yOffset = height * (anchors.y as any)[d.yanchor].offset;

        let sizing = (anchors.x as any)[d.xanchor].sizing + (anchors.y as any)[d.yanchor].sizing;

        // Final positions
        let xPos, yPos;
        if(xa !== undefined) {
            xPos = ((typeof(d.xref) === 'string') && xIsDomain) ?
                xa._length * d.x + xa._offset :
                xa.r2p(d.x) + xa._offset;
        } else {
            xPos = d.x * size.w + size.l;
        }
        xPos += xOffset;
        if(ya !== undefined) {
            yPos = ((typeof(d.yref) === 'string') && yIsDomain) ?
                // consistent with "paper" yref value, where positive values
                // move up the page
                ya._length * (1 - d.y) + ya._offset :
                ya.r2p(d.y) + ya._offset;
        } else {
            yPos = size.h - d.y * size.h + size.t;
        }
        yPos += yOffset;

        // Construct the proper aspectRatio attribute
        switch(d.sizing) {
            case 'fill':
                sizing += ' slice';
                break;

            case 'stretch':
                sizing = 'none';
                break;
        }

        thisImage.attr({
            x: xPos,
            y: yPos,
            width: width,
            height: height,
            preserveAspectRatio: sizing,
            opacity: d.opacity
        });

        // Set proper clipping on images
        const xId = xa && (Axes.getRefType(d.xref) !== 'domain') ? xa._id : '';
        const yId = ya && (Axes.getRefType(d.yref) !== 'domain') ? ya._id : '';
        const clipAxes = xId + yId;

        setClipUrl(
            thisImage,
            (clipAxes ? ('clip' + fullLayout._uid + clipAxes) : null as any),
            gd
        );
    }

    function imgDataFunc(d: any) {
        return [d.xref, d.x, d.sizex, d.yref, d.y, d.sizey].join('_');
    }

    function imgSort(a: any, b: any) { return a._index - b._index; }

    const imagesBelow = fullLayout._imageLowerLayer.selectAll('image')
        .data(imageDataBelow, imgDataFunc);
    const imagesAbove = fullLayout._imageUpperLayer.selectAll('image')
        .data(imageDataAbove, imgDataFunc);

    imagesBelow.enter().append('image');
    imagesAbove.enter().append('image');

    imagesBelow.exit().remove();
    imagesAbove.exit().remove();

    imagesBelow.each(function(this: any, d: any) {
        setImage.bind(this)(d);
        applyAttributes.bind(this)(d);
    });
    imagesAbove.each(function(this: any, d: any) {
        setImage.bind(this)(d);
        applyAttributes.bind(this)(d);
    });
    imagesBelow.sort(imgSort);
    imagesAbove.sort(imgSort);

    const allSubplots = Object.keys(fullLayout._plots);
    for(i = 0; i < allSubplots.length; i++) {
        subplot = allSubplots[i];
        const subplotObj = fullLayout._plots[subplot];

        // filter out overlaid plots (which have their images on the main plot)
        if(!subplotObj.imagelayer) continue;

        const imagesOnSubplot = subplotObj.imagelayer.selectAll('image')
            // even if there are no images on this subplot, we need to run
            // enter and exit in case there were previously
            .data(imageDataSubplot[subplot] || [], imgDataFunc);

        imagesOnSubplot.enter().append('image');
        imagesOnSubplot.exit().remove();

        imagesOnSubplot.each(function(this: any, d: any) {
            setImage.bind(this)(d);
            applyAttributes.bind(this)(d);
        });
        imagesOnSubplot.sort(imgSort);
    }
}
