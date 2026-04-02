export default function setCursor(el3: any, csr?: string): void {
    (el3.attr('class') || '').split(' ').forEach((cls: string) => {
        if(cls.indexOf('cursor-') === 0) el3.classed(cls, false);
    });

    if(csr) el3.classed('cursor-' + csr, true);
}
