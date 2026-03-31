import Lib from '../../lib/index.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
import constants from './constants.js';

var name = constants.name;
var buttonAttrs = attributes.buttons;

export default function updateMenusDefaults(layoutIn: any, layoutOut: any) {
    var opts = {
        name: name,
        handleItemDefaults: menuDefaults
    };

    handleArrayContainerDefaults(layoutIn, layoutOut, opts);
}

function menuDefaults(menuIn: any, menuOut: any, layoutOut: any) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(menuIn, menuOut, attributes, attr, dflt);
    }

    var buttons = handleArrayContainerDefaults(menuIn, menuOut, {
        name: 'buttons',
        handleItemDefaults: buttonDefaults
    });

    var visible = coerce('visible', buttons.length > 0);
    if(!visible) return;

    coerce('active');
    coerce('direction');
    coerce('type');
    coerce('showactive');

    coerce('x');
    coerce('y');
    Lib.noneOrAll(menuIn, menuOut, ['x', 'y']);

    coerce('xanchor');
    coerce('yanchor');

    coerce('pad.t');
    coerce('pad.r');
    coerce('pad.b');
    coerce('pad.l');

    Lib.coerceFont(coerce, 'font', layoutOut.font);

    coerce('bgcolor', layoutOut.paper_bgcolor);
    coerce('bordercolor');
    coerce('borderwidth');
}

function buttonDefaults(buttonIn: any, buttonOut: any) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(buttonIn, buttonOut, buttonAttrs, attr, dflt);
    }

    var visible = coerce('visible',
        (buttonIn.method === 'skip' || Array.isArray(buttonIn.args)));
    if(visible) {
        coerce('method');
        coerce('args');
        coerce('args2');
        coerce('label');
        coerce('execute');
    }
}
