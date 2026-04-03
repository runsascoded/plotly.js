import showNoWebGlMsg from './show_no_webgl_msg.js';
import createRegl from '@plotly/regl';
export default function prepareRegl(gd, extensions, reglPrecompiled) {
    const fullLayout = gd._fullLayout;
    let success = true;
    fullLayout._glcanvas.each(function (d) {
        if (d.regl) {
            d.regl.preloadCachedCode(reglPrecompiled);
            return;
        }
        // only parcoords needs pick layer
        if (d.pick && !fullLayout._has('parcoords'))
            return;
        try {
            d.regl = createRegl({
                canvas: this,
                attributes: {
                    antialias: !d.pick,
                    preserveDrawingBuffer: true
                },
                pixelRatio: gd._context.plotGlPixelRatio || globalThis.devicePixelRatio,
                extensions: extensions || [],
                cachedCode: reglPrecompiled || {}
            });
        }
        catch (e) {
            success = false;
        }
        if (!d.regl)
            success = false;
        if (success) {
            this.addEventListener('webglcontextlost', function (event) {
                if (gd && gd.emit) {
                    gd.emit('plotly_webglcontextlost', {
                        event: event,
                        layer: d.key
                    });
                }
            }, false);
        }
    });
    if (!success) {
        showNoWebGlMsg({ container: fullLayout._glcontainer.node() });
    }
    return success;
}
