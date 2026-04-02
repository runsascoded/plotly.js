import { select } from 'd3-selection';
import type { GraphDiv } from '../../../types/core';
import Fx from '../../components/fx/index.js';
import dragElement from '../../components/dragelement/index.js';
import setCursor from '../../lib/setcursor.js';
import _dragbox from './dragbox.js';
const { makeDragBox } = _dragbox;
import _constants from './constants.js';
const { DRAGGERSIZE } = _constants;

export function initInteractions(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;

    if(gd._context.staticPlot) {
        // this sweeps up more than just cartesian drag elements...
        select(gd).selectAll('.drag').remove();
        return;
    }

    if(!fullLayout._has('cartesian') && !fullLayout._has('splom')) return;

    const subplots = Object.keys(fullLayout._plots || {}).sort((a, b) => {
        // sort overlays last, then by x axis number, then y axis number
        if((fullLayout._plots[a].mainplot && true) ===
            (fullLayout._plots[b].mainplot && true)) {
            const aParts = a.split('y');
            const bParts = b.split('y');
            return (aParts[0] === bParts[0]) ?
                (Number(aParts[1] || 1) - Number(bParts[1] || 1)) :
                (Number(aParts[0] || 1) - Number(bParts[0] || 1));
        }
        return fullLayout._plots[a].mainplot ? 1 : -1;
    });

    subplots.forEach((subplot) => {
        const plotinfo = fullLayout._plots[subplot];
        const xa: any = plotinfo.xaxis;
        const ya = plotinfo.yaxis;

        // main and corner draggers need not be repeated for
        // overlaid subplots - these draggers drag them all
        if(!plotinfo.mainplot) {
            // main dragger goes over the grids and data, so we use its
            // mousemove events for all data hover effects
            const maindrag: any = makeDragBox(gd, plotinfo, xa._offset, ya._offset,
                xa._length, ya._length, 'ns', 'ew');

            maindrag.onmousemove = function(evt?: any) {
                // This is on `gd._fullLayout`, *not* fullLayout because the reference
                // changes by the time this is called again.
                gd._fullLayout._rehover = function() {
                    if((gd._fullLayout._hoversubplot === subplot) && gd._fullLayout._plots[subplot]) {
                        Fx.hover(gd, evt, subplot);
                    }
                };

                Fx.hover(gd, evt, subplot);

                // Note that we have *not* used the cached fullLayout variable here
                // since that may be outdated when this is called as a callback later on
                gd._fullLayout._lasthover = maindrag;
                gd._fullLayout._hoversubplot = subplot;
            };

            /*
             * IMPORTANT:
             * We must check for the presence of the drag cover here.
             * If we don't, a 'mouseout' event is triggered on the
             * maindrag before each 'click' event, which has the effect
             * of clearing the hoverdata; thus, cancelling the click event.
             */
            maindrag.onmouseout = function(evt?: any) {
                if(gd._dragging) return;

                // When the mouse leaves this maindrag, unset the hovered subplot.
                // This may cause problems if it leaves the subplot directly *onto*
                // another subplot, but that's a tiny corner case at the moment.
                gd._fullLayout._hoversubplot = null;

                dragElement.unhover(gd, evt);
            };

            // corner draggers
            if(gd._context.showAxisDragHandles) {
                makeDragBox(gd, plotinfo, xa._offset - DRAGGERSIZE, ya._offset - DRAGGERSIZE,
                    DRAGGERSIZE, DRAGGERSIZE, 'n', 'w');
                makeDragBox(gd, plotinfo, xa._offset + xa._length, ya._offset - DRAGGERSIZE,
                    DRAGGERSIZE, DRAGGERSIZE, 'n', 'e');
                makeDragBox(gd, plotinfo, xa._offset - DRAGGERSIZE, ya._offset + ya._length,
                    DRAGGERSIZE, DRAGGERSIZE, 's', 'w');
                makeDragBox(gd, plotinfo, xa._offset + xa._length, ya._offset + ya._length,
                    DRAGGERSIZE, DRAGGERSIZE, 's', 'e');
            }
        }
        if(gd._context.showAxisDragHandles) {
            // x axis draggers - if you have overlaid plots,
            // these drag each axis separately
            if(subplot === xa._mainSubplot) {
                // the y position of the main x axis line
                let y0 = xa._mainLinePosition;
                if(xa.side === 'top') y0 -= DRAGGERSIZE;
                makeDragBox(gd, plotinfo, xa._offset + xa._length * 0.1, y0,
                    xa._length * 0.8, DRAGGERSIZE, '', 'ew');
                makeDragBox(gd, plotinfo, xa._offset, y0,
                    xa._length * 0.1, DRAGGERSIZE, '', 'w');
                makeDragBox(gd, plotinfo, xa._offset + xa._length * 0.9, y0,
                    xa._length * 0.1, DRAGGERSIZE, '', 'e');
            }
            // y axis draggers
            if(subplot === ya._mainSubplot) {
                // the x position of the main y axis line
                let x0 = ya._mainLinePosition;
                if(ya.side !== 'right') x0 -= DRAGGERSIZE;
                makeDragBox(gd, plotinfo, x0, ya._offset + ya._length * 0.1,
                    DRAGGERSIZE, ya._length * 0.8, 'ns', '');
                makeDragBox(gd, plotinfo, x0, ya._offset + ya._length * 0.9,
                    DRAGGERSIZE, ya._length * 0.1, 's', '');
                makeDragBox(gd, plotinfo, x0, ya._offset,
                    DRAGGERSIZE, ya._length * 0.1, 'n', '');
            }
        }
    });

    // In case you mousemove over some hovertext, send it to Fx.hover too
    // we do this so that we can put the hover text in front of everything,
    // but still be able to interact with everything as if it isn't there
    const hoverLayer: any = fullLayout._hoverlayer.node();

    hoverLayer.onmousemove = function(evt?: any) {
        evt.target = gd._fullLayout._lasthover;
        Fx.hover(gd, evt, fullLayout._hoversubplot);
    };

    hoverLayer.onclick = function(evt?: any) {
        evt.target = gd._fullLayout._lasthover;
        Fx.click(gd, evt);
    };

    // also delegate mousedowns... TODO: does this actually work?
    hoverLayer.onmousedown = function(evt?: any) {
        gd._fullLayout._lasthover.onmousedown(evt);
    };

    updateFx(gd);
}

export function updateFx(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;
    const cursor = fullLayout.dragmode === 'pan' ? 'move' : 'crosshair';
    setCursor(fullLayout._draggers, cursor);
}

export default { initInteractions, updateFx };
