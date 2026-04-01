import constants from '../constants/pixelated_image.js';
import { tester } from '../components/drawing/index.js';
import Lib from '../lib/index.js';

var _supportsPixelated: boolean | null = null;

/**
 * Check browser support for pixelated image rendering
 *
 * @return {boolean}
 */
function supportsPixelatedImage(): boolean {
    if(_supportsPixelated !== null) { // only run the feature detection once
        return _supportsPixelated;
    }

    _supportsPixelated = false;

    // @see https://github.com/plotly/plotly.js/issues/6604
    var unsupportedBrowser = Lib.isSafari() || Lib.isMacWKWebView() || Lib.isIOS();

    if(window.navigator.userAgent && !unsupportedBrowser) {
        var declarations = Array.from(constants.CSS_DECLARATIONS).reverse();

        var supports = (window.CSS && window.CSS.supports) || (window as any).supportsCSS;
        if(typeof supports === 'function') {
            _supportsPixelated = declarations.some(function(d: any) {
                return supports.apply(null, d);
            });
        } else {
            var image3 = tester.append('image')
                .attr('style', constants.STYLE);

            var cStyles = window.getComputedStyle(image3.node());
            var imageRendering = cStyles.imageRendering;

            _supportsPixelated = declarations.some(function(d: any) {
                var value = d[1];
                return (
                    imageRendering === value ||
                    imageRendering === value.toLowerCase()
                );
            });

            image3.remove();
        }
    }

    return _supportsPixelated;
}

export default supportsPixelatedImage;
