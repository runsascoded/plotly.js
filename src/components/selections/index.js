import drawModule from './draw.js';
import select from './select.js';
import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './draw_newselection/defaults.js';
import _req3 from '../../plots/cartesian/include_components.js';

export default {
    moduleType: 'component',
    name: 'selections',

    layoutAttributes: _req0,
    supplyLayoutDefaults: _req1,
    supplyDrawNewSelectionDefaults: _req2,
    includeBasePlot: _req3('selections'),

    draw: drawModule.draw,
    drawOne: drawModule.drawOne,

    reselect: select.reselect,
    prepSelect: select.prepSelect,
    clearOutline: select.clearOutline,
    clearSelectionsCache: select.clearSelectionsCache,
    selectOnClick: select.selectOnClick
};
