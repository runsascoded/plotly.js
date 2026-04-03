export default function setCursor(el3, csr) {
    (el3.attr('class') || '').split(' ').forEach((cls) => {
        if (cls.indexOf('cursor-') === 0)
            el3.classed(cls, false);
    });
    if (csr)
        el3.classed('cursor-' + csr, true);
}
