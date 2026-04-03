import isNumeric from 'fast-isnumeric';
import Lib, { noneOrAll } from '../../lib/index.js';
export default function handlePositionDefaults(containerIn, containerOut, coerce, options) {
    const counterAxes = options.counterAxes || [];
    const overlayableAxes = options.overlayableAxes || [];
    const letter = options.letter;
    const grid = options.grid;
    const overlayingDomain = options.overlayingDomain;
    let dfltAnchor, dfltDomain, dfltSide, dfltPosition, dfltShift, dfltAutomargin;
    if (grid) {
        dfltDomain = grid._domains[letter][grid._axisMap[containerOut._id]];
        dfltAnchor = grid._anchors[containerOut._id];
        if (dfltDomain) {
            dfltSide = grid[letter + 'side'].split(' ')[0];
            dfltPosition = grid.domain[letter][dfltSide === 'right' || dfltSide === 'top' ? 1 : 0];
        }
    }
    // Even if there's a grid, this axis may not be in it - fall back on non-grid defaults
    dfltDomain = dfltDomain || [0, 1];
    dfltAnchor = dfltAnchor || (isNumeric(containerIn.position) ? 'free' : (counterAxes[0] || 'free'));
    dfltSide = dfltSide || (letter === 'x' ? 'bottom' : 'left');
    dfltPosition = dfltPosition || 0;
    dfltShift = 0;
    dfltAutomargin = false;
    const anchor = Lib.coerce(containerIn, containerOut, {
        anchor: {
            valType: 'enumerated',
            values: ['free'].concat(counterAxes),
            dflt: dfltAnchor
        }
    }, 'anchor');
    const side = Lib.coerce(containerIn, containerOut, {
        side: {
            valType: 'enumerated',
            values: letter === 'x' ? ['bottom', 'top'] : ['left', 'right'],
            dflt: dfltSide
        }
    }, 'side');
    if (anchor === 'free') {
        if (letter === 'y') {
            const autoshift = coerce('autoshift');
            if (autoshift) {
                dfltPosition = side === 'left' ? overlayingDomain[0] : overlayingDomain[1];
                dfltAutomargin = containerOut.automargin ? containerOut.automargin : true;
                dfltShift = side === 'left' ? -3 : 3;
            }
            coerce('shift', dfltShift);
        }
        coerce('position', dfltPosition);
    }
    coerce('automargin', dfltAutomargin);
    let overlaying = false;
    if (overlayableAxes.length) {
        overlaying = Lib.coerce(containerIn, containerOut, {
            overlaying: {
                valType: 'enumerated',
                values: [false].concat(overlayableAxes),
                dflt: false
            }
        }, 'overlaying');
    }
    if (!overlaying) {
        // TODO: right now I'm copying this domain over to overlaying axes
        // in ax.setscale()... but this means we still need (imperfect) logic
        // in the axes popover to hide domain for the overlaying axis.
        // perhaps I should make a private version _domain that all axes get???
        const domain = coerce('domain', dfltDomain);
        // according to https://www.npmjs.com/package/canvas-size
        // the minimum value of max canvas width across browsers and devices is 4096
        // which applied in the calculation below:
        if (domain[0] > domain[1] - 1 / 4096)
            containerOut.domain = dfltDomain;
        noneOrAll(containerIn.domain, containerOut.domain, dfltDomain);
        // tickmode sync needs an overlaying axis, otherwise
        // we should default it to 'auto'
        if (containerOut.tickmode === 'sync') {
            containerOut.tickmode = 'auto';
        }
    }
    coerce('layer');
    return containerOut;
}
