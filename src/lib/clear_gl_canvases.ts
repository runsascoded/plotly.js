import type { GraphDiv } from '../../types/core';

export default function clearGlCanvases(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;

    if(fullLayout._glcanvas && fullLayout._glcanvas.size()) {
        fullLayout._glcanvas.each(function(d: any) {
            if(d.regl) d.regl.clear({color: true, depth: true});
        });
    }
}
