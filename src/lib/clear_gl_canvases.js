export default function clearGlCanvases(gd) {
    const fullLayout = gd._fullLayout;
    if (fullLayout._glcanvas && fullLayout._glcanvas.size()) {
        fullLayout._glcanvas.each(function (d) {
            if (d.regl)
                d.regl.clear({ color: true, depth: true });
        });
    }
}
