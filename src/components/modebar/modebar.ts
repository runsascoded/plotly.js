import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import Icons from '../../fonts/ploticon.js';
import { version } from '../../version.js';

const Parser = new DOMParser();

/**
 * UI controller for interactive plots
 * @Class
 * @Param {object} opts
 * @Param {object} opts.buttons    nested arrays of grouped buttons config objects
 * @Param {object} opts.container  container div to append modeBar
 * @Param {object} opts.graphInfo  primary plot object containing data and layout
 */
function ModeBar(this: any, opts: any) {
    this.container = opts.container;
    this.element = document.createElement('div');

    this.update(opts.graphInfo, opts.buttons);

    this.container.appendChild(this.element);
}

const proto = ModeBar.prototype;

/**
 * Update modeBar (buttons and logo)
 *
 * @param {object} graphInfo  primary plot object containing data and layout
 * @param {array of arrays} buttons nested arrays of grouped buttons to initialize
 *
 */
proto.update = function(graphInfo: any, buttons: any) {
    this.graphInfo = graphInfo;

    const context = this.graphInfo._context;
    const fullLayout = this.graphInfo._fullLayout;
    const modeBarId = 'modebar-' + fullLayout._uid;

    this.element.setAttribute('id', modeBarId);
    this.element.setAttribute('role', 'toolbar');

    this._uid = modeBarId;
    this.element.className = 'modebar modebar--custom';
    if(context.displayModeBar === 'hover') this.element.className += ' modebar--hover ease-bg';

    if(fullLayout.modebar.orientation === 'v') {
        this.element.className += ' vertical';
        buttons = buttons.reverse();
    }

    const style = fullLayout.modebar;

    // set style for modebar-group directly instead of inline CSS that's not allowed by strict CSP's
    const groupSelector = '#' + modeBarId + ' .modebar-group';
    document.querySelectorAll(groupSelector).forEach(function(group: any) {
        group.style.backgroundColor = style.bgcolor;
    });
    // if buttons or logo have changed, redraw modebar interior
    const needsNewButtons = !this.hasButtons(buttons);
    const needsNewLogo = (this.hasLogo !== context.displaylogo);
    const needsNewLocale = (this.locale !== context.locale);

    this.locale = context.locale;

    if(needsNewButtons || needsNewLogo || needsNewLocale) {
        this.removeAllButtons();

        this.updateButtons(buttons);

        if(context.watermark || context.displaylogo) {
            const logoGroup = this.getLogo();
            if(context.watermark) {
                logoGroup.className = logoGroup.className + ' watermark';
            }

            if(fullLayout.modebar.orientation === 'v') {
                this.element.insertBefore(logoGroup, this.element.childNodes[0]);
            } else {
                this.element.appendChild(logoGroup);
            }

            this.hasLogo = true;
        }
    }

    this.updateActiveButton();

    // set styles on hover using event listeners instead of inline CSS that's not allowed by strict CSP's
    Lib.setStyleOnHover('#' + modeBarId + ' .modebar-btn', '.active', '.icon path', 'fill: ' + style.activecolor, 'fill: ' + style.color, this.element);

};

proto.updateButtons = function(buttons: any) {
    const _this = this;

    this.buttons = buttons;
    this.buttonElements = [];
    this.buttonsNames = [];

    this.buttons.forEach(function(buttonGroup: any) {
        const group = _this.createGroup();

        buttonGroup.forEach(function(buttonConfig: any) {
            const buttonName = buttonConfig.name;
            if(!buttonName) {
                throw new Error('must provide button \'name\' in button config');
            }
            if(_this.buttonsNames.indexOf(buttonName) !== -1) {
                throw new Error('button name \'' + buttonName + '\' is taken');
            }
            _this.buttonsNames.push(buttonName);

            const button = _this.createButton(buttonConfig);
            _this.buttonElements.push(button);
            group.appendChild(button);
        });

        _this.element.appendChild(group);
    });
};

/**
 * Empty div for containing a group of buttons
 * @Return {HTMLelement}
 */
proto.createGroup = function() {
    const group = document.createElement('div');
    group.className = 'modebar-group';

    const style = this.graphInfo._fullLayout.modebar;
    group.style.backgroundColor = style.bgcolor;

    return group;
};

/**
 * Create a new button div and set constant and configurable attributes
 * @Param {object} config (see ./buttons.js for more info)
 * @Return {HTMLelement}
 */
proto.createButton = function(config: any) {
    const _this = this;
    const button = document.createElement('button');

    button.setAttribute('type', 'button');
    button.setAttribute('rel', 'tooltip');
    button.className = 'modebar-btn';

    let title = config.title;
    if(title === undefined) title = config.name;
    // for localization: allow title to be a callable that takes gd as arg
    else if(typeof title === 'function') title = title(this.graphInfo);

    if(title || title === 0) {
        button.setAttribute('data-title', title)
        button.setAttribute("aria-label", title)
    };

    if(config.attr !== undefined) button.setAttribute('data-attr', config.attr);

    let val = config.val;
    if(val !== undefined) {
        if(typeof val === 'function') val = val(this.graphInfo);
        button.setAttribute('data-val', val);
    }

    const click = config.click;
    if(typeof click !== 'function') {
        throw new Error('must provide button \'click\' function in button config');
    } else {
        button.addEventListener('click', function(ev: any) {
            config.click(_this.graphInfo, ev);

            // only needed for 'hoverClosestGeo' which does not call relayout
            _this.updateActiveButton(ev.currentTarget);
        });
    }

    button.setAttribute('data-toggle', config.toggle || false);
    if(config.toggle) select(button).classed('active', true);

    const icon = config.icon;
    if(typeof icon === 'function') {
        button.appendChild(icon());
    } else {
        button.appendChild(this.createIcon(icon || Icons.question));
    }
    button.setAttribute('data-gravity', config.gravity || 'n');

    return button;
};

/**
 * Add an icon to a button
 * @Param {object} thisIcon
 * @Param {number} thisIcon.width
 * @Param {string} thisIcon.path
 * @Param {string} thisIcon.color
 * @Return {HTMLelement}
 */
proto.createIcon = function(thisIcon: any) {
    const iconHeight = isNumeric(thisIcon.height) ?
        Number(thisIcon.height) :
        thisIcon.ascent - thisIcon.descent;
    const svgNS = 'http://www.w3.org/2000/svg';
    let icon: any;

    if(thisIcon.path) {
        icon = document.createElementNS(svgNS, 'svg');
        icon.setAttribute('viewBox', [0, 0, thisIcon.width, iconHeight].join(' '));
        icon.setAttribute('class', 'icon');

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', thisIcon.path);

        if(thisIcon.transform) {
            path.setAttribute('transform', thisIcon.transform);
        } else if(thisIcon.ascent !== undefined) {
            // Legacy icon transform calculation
            path.setAttribute('transform', 'matrix(1 0 0 -1 0 ' + thisIcon.ascent + ')');
        }

        icon.appendChild(path);
    }

    if(thisIcon.svg) {
        const svgDoc = Parser.parseFromString(thisIcon.svg, 'application/xml');
        icon = svgDoc.childNodes[0];
    }

    icon.setAttribute('height', '1em');
    icon.setAttribute('width', '1em');

    return icon;
};

/**
 * Updates active button with attribute specified in layout
 * @Param {object} graphInfo plot object containing data and layout
 * @Return {HTMLelement}
 */
proto.updateActiveButton = function(buttonClicked: any) {
    const fullLayout = this.graphInfo._fullLayout;
    const dataAttrClicked = (buttonClicked !== undefined) ?
        buttonClicked.getAttribute('data-attr') :
        null;

    this.buttonElements.forEach(function(button: any) {
        const thisval = button.getAttribute('data-val') || true;
        const dataAttr = button.getAttribute('data-attr');
        const isToggleButton = (button.getAttribute('data-toggle') === 'true');
        const button3 = select(button);

        // set style on button based on its state at the moment this is called
        // (e.g. during the handling when a modebar button is clicked)
        const updateButtonStyle = function(button: any, isActive: any) {
            const style = fullLayout.modebar;
            const childEl = button.querySelector('.icon path');
            if(childEl) {
                if(isActive || button.matches(':hover')) {
                    childEl.style.fill = style.activecolor;
                } else {
                    childEl.style.fill = style.color;
                }
            }
        };

        // Use 'data-toggle' and 'buttonClicked' to toggle buttons
        // that have no one-to-one equivalent in fullLayout
        if(isToggleButton) {
            if(dataAttr === dataAttrClicked) {
                const isActive = !button3.classed('active');
                button3.classed('active', isActive);
                updateButtonStyle(button, isActive);
            }
        } else {
            const val = (dataAttr === null) ?
                dataAttr :
                Lib.nestedProperty(fullLayout, dataAttr).get();

            button3.classed('active', val === thisval);
            updateButtonStyle(button, val === thisval);
        }
    });
};

/**
 * Check if modeBar is configured as button configuration argument
 *
 * @Param {object} buttons 2d array of grouped button config objects
 * @Return {boolean}
 */
proto.hasButtons = function(buttons: any) {
    const currentButtons = this.buttons;

    if(!currentButtons) return false;

    if(buttons.length !== currentButtons.length) return false;

    for(let i = 0; i < buttons.length; ++i) {
        if(buttons[i].length !== currentButtons[i].length) return false;
        for(let j = 0; j < buttons[i].length; j++) {
            if(buttons[i][j].name !== currentButtons[i][j].name) return false;
        }
    }

    return true;
};

function jsVersion(str: any) {
    return str + ' (v' + version + ')';
}

/**
 * @return {HTMLDivElement} The logo image wrapped in a group
 */
proto.getLogo = function() {
    const group = this.createGroup();
    const a = document.createElement('a');

    a.href = 'https://plotly.com/';
    a.target = '_blank';
    a.setAttribute('data-title', jsVersion(Lib._(this.graphInfo, 'Produced with Plotly.js')));
    a.className = 'modebar-btn plotlyjsicon modebar-btn--logo';

    a.appendChild(this.createIcon(Icons.newplotlylogo));

    group.appendChild(a);
    return group;
};

proto.removeAllButtons = function() {
    while(this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
    }

    this.hasLogo = false;
};

proto.destroy = function() {
    Lib.removeElement(this.container.querySelector('.modebar'));
};

function createModeBar(gd: GraphDiv, buttons: any) {
    const fullLayout = gd._fullLayout;

    // @ts-ignore TS7009
    const modeBar: any = new ModeBar({
        graphInfo: gd,
        container: fullLayout._modebardiv.node(),
        buttons: buttons
    });

    if(fullLayout._privateplot) {
        select(modeBar.element).append('span')
            .classed('badge-private float--left', true)
            .text('PRIVATE');
    }

    return modeBar;
}

export default createModeBar;
