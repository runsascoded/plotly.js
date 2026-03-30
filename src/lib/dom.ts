import { select } from 'd3-selection';
import loggers from './loggers.js';
import matrix, { mat4Multiply } from './matrix.js';

/**
 * Allow referencing a graph DOM element either directly
 * or by its id string
 *
 * @param gd a graph element or its id
 * @returns the DOM element of the graph
 */
function getGraphDiv(gd: HTMLDivElement | string): HTMLDivElement {
    var gdElement: HTMLDivElement | null;

    if(typeof gd === 'string') {
        gdElement = document.getElementById(gd) as HTMLDivElement | null;

        if(gdElement === null) {
            throw new Error('No DOM element with id \'' + gd + '\' exists on the page.');
        }

        return gdElement;
    } else if(gd === null || gd === undefined) {
        throw new Error('DOM element provided is null or undefined');
    }

    // otherwise assume that gd is a DOM element
    return gd;
}

function isPlotDiv(el: any): boolean {
    var el3 = select(el);
    return el3.node() instanceof HTMLElement &&
        el3.size() &&
        el3.classed('js-plotly-plot');
}

function removeElement(el: Element | null): void {
    var elParent = el && el.parentNode;
    if(elParent) elParent.removeChild(el!);
}

/**
 * for dynamically adding style rules
 * makes one stylesheet that contains all rules added
 * by all calls to this function
 */
function addStyleRule(selector: string, styleString: string): void {
    addRelatedStyleRule('global', selector, styleString);
}

/**
 * for dynamically adding style rules
 * to a stylesheet uniquely identified by a uid
 */
function addRelatedStyleRule(uid: string, selector: string, styleString: string): void {
    var id = 'plotly.js-style-' + uid;
    var style: HTMLStyleElement | null = document.getElementById(id) as HTMLStyleElement | null;
    if(style && style.matches('.no-inline-styles')) {
        // Do not proceed if user disable inline styles explicitly...
        return;
    }
    if(!style) {
        style = document.createElement('style');
        style.setAttribute('id', id);
        // WebKit hack :(
        style.appendChild(document.createTextNode(''));
        document.head.appendChild(style);
    }
    var styleSheet = style.sheet;

    if(!styleSheet) {
        loggers.warn('Cannot addRelatedStyleRule, probably due to strict CSP...');
    } else if(styleSheet.insertRule) {
        styleSheet.insertRule(selector + '{' + styleString + '}', 0);
    } else if((styleSheet as any).addRule) {
        (styleSheet as any).addRule(selector, styleString, 0);
    } else loggers.warn('addStyleRule failed');
}

/**
 * to remove from the page a stylesheet identified by a given uid
 */
function deleteRelatedStyleRule(uid: string): void {
    var id = 'plotly.js-style-' + uid;
    var style = document.getElementById(id);
    if(style) removeElement(style);
}

/**
 * Setup event listeners on button elements to emulate the ':hover' state without using inline styles,
 * which is not allowed with strict CSP.  This supports modebar buttons set with the 'active' class,
 * in which case, the active style remains even when it's no longer hovered.
 * @param selector selector for button elements to be styled when hovered
 * @param activeSelector selector used to determine if selected element is active
 * @param childSelector the child element on which the styling needs to be updated
 * @param activeStyle    style that has to be applied when 'hovered' or 'active'
 * @param inactiveStyle    style that has to be applied when not 'hovered' nor 'active'
 * @param element optional root element to query within
 */
function setStyleOnHover(selector: string, activeSelector: string, childSelector: string, activeStyle: string, inactiveStyle: string, element?: Document | Element): void {
    var activeStyleParts = activeStyle.split(':');
    var inactiveStyleParts = inactiveStyle.split(':');
    var eventAddedAttrName = 'data-btn-style-event-added';
    if (!element) {
        element = document;
    }
    element.querySelectorAll(selector).forEach(function(el) {
        if(!el.getAttribute(eventAddedAttrName)) {
            // Emulate ":hover" CSS style using JS event handlers to set the
            // style in a strict CSP-compliant manner.
            el.addEventListener('mouseenter', function(this: any) {
                var childEl = this.querySelector(childSelector) as HTMLElement | null;
                if(childEl) {
                    (childEl.style as any)[activeStyleParts[0]] = activeStyleParts[1];
                }
            });
            el.addEventListener('mouseleave', function(this: any) {
                var childEl = this.querySelector(childSelector) as HTMLElement | null;
                if(childEl) {
                    if(activeSelector && this.matches(activeSelector)) {
                        (childEl.style as any)[activeStyleParts[0]] = activeStyleParts[1];
                    } else {
                        (childEl.style as any)[inactiveStyleParts[0]] = inactiveStyleParts[1];
                    }
                }
            });
            el.setAttribute(eventAddedAttrName, 'true');
        }
    });
}

function getFullTransformMatrix(element: Element): number[] {
    var allElements = getElementAndAncestors(element);
    // the identity matrix
    var out: number[] = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    allElements.forEach(function(e) {
        var t = getElementTransformMatrix(e);
        if(t) {
            var m = matrix.convertCssMatrix(t);
            out = mat4Multiply(out, out, m);
        }
    });
    return out;
}

/**
 * extracts and parses the 2d css style transform matrix from some element
 */
function getElementTransformMatrix(element: Element): number[] | null {
    var style = window.getComputedStyle(element, null);
    var transform = (
      style.getPropertyValue('-webkit-transform') ||
      style.getPropertyValue('-moz-transform') ||
      style.getPropertyValue('-ms-transform') ||
      style.getPropertyValue('-o-transform') ||
      style.getPropertyValue('transform')
    );

    if(transform === 'none') return null;
    // the transform is a string in the form of matrix(a, b, ...) or matrix3d(...)
    return transform
        .replace('matrix', '')
        .replace('3d', '')
        .slice(1, -1)
        .split(',')
        .map(function(n) { return +n; });
}
/**
 * retrieve all DOM elements that are ancestors of the specified one (including itself)
 */
function getElementAndAncestors(element: Element | Node): Element[] {
    var allElements: Element[] = [];
    while(isTransformableElement(element)) {
        allElements.push(element as Element);
        element = (element as Element).parentNode!;
        if(typeof ShadowRoot === 'function' && element instanceof ShadowRoot) {
            element = element.host;
        }
    }
    return allElements;
}

function isTransformableElement(element: any): boolean {
    return element && (element instanceof Element || element instanceof HTMLElement);
}

function equalDomRects(a: DOMRect | null, b: DOMRect | null): boolean {
    return !!(
        a && b &&
        a.top === b.top &&
        a.left === b.left &&
        a.right === b.right &&
        a.bottom === b.bottom
    );
}

export { addStyleRule, getGraphDiv, isPlotDiv, removeElement, addRelatedStyleRule, deleteRelatedStyleRule, setStyleOnHover, getFullTransformMatrix, getElementTransformMatrix, getElementAndAncestors, equalDomRects };

export default {
    getGraphDiv: getGraphDiv,
    isPlotDiv: isPlotDiv,
    removeElement: removeElement,
    addStyleRule: addStyleRule,
    addRelatedStyleRule: addRelatedStyleRule,
    deleteRelatedStyleRule: deleteRelatedStyleRule,
    setStyleOnHover: setStyleOnHover,
    getFullTransformMatrix: getFullTransformMatrix,
    getElementTransformMatrix: getElementTransformMatrix,
    getElementAndAncestors: getElementAndAncestors,
    equalDomRects: equalDomRects
};
