import constants from '../constants/pixelated_image.js';
import { tester } from '../components/drawing/index.js';
import Lib from '../lib/index.js';
let _supportsPixelated = null;
/**
 * Check browser support for pixelated image rendering
 *
 * @return {boolean}
 */
function supportsPixelatedImage() {
    if (_supportsPixelated !== null) { // only run the feature detection once
        return _supportsPixelated;
    }
    _supportsPixelated = false;
    // @see https://github.com/plotly/plotly.js/issues/6604
    const unsupportedBrowser = Lib.isSafari() || Lib.isMacWKWebView() || Lib.isIOS();
    if (window.navigator.userAgent && !unsupportedBrowser) {
        const declarations = Array.from(constants.CSS_DECLARATIONS).reverse();
        const supports = (window.CSS && window.CSS.supports) || window.supportsCSS;
        if (typeof supports === 'function') {
            _supportsPixelated = declarations.some(function (d) {
                return supports.apply(null, d);
            });
        }
        else {
            const image3 = tester.append('image')
                .attr('style', constants.STYLE);
            const cStyles = window.getComputedStyle(image3.node());
            const imageRendering = cStyles.imageRendering;
            _supportsPixelated = declarations.some(function (d) {
                const value = d[1];
                return (imageRendering === value ||
                    imageRendering === value.toLowerCase());
            });
            image3.remove();
        }
    }
    return _supportsPixelated;
}
export default supportsPixelatedImage;
