import type { GraphDiv, FullLayout } from '../../../types/core';
import { select } from 'd3-selection';
import { setTransormAndDisplay } from '../../lib/index.js';

function resizeText(gd: GraphDiv, gTrace: any, traceType: string): void {
    const fullLayout = gd._fullLayout;
    const minSize = fullLayout['_' + traceType + 'Text_minsize'];
    if(minSize) {
        const shouldHide = fullLayout.uniformtext.mode === 'hide';

        let selector;
        switch(traceType) {
            case 'funnelarea' :
            case 'pie' :
            case 'sunburst' :
                selector = 'g.slice';
                break;
            case 'treemap' :
            case 'icicle' :
                selector = 'g.slice, g.pathbar';
                break;
            default :
                selector = 'g.points > g.point';
        }

        gTrace.selectAll(selector).each(function(this: any, d: any) {
            const transform = d.transform;
            if(transform) {
                transform.scale = (shouldHide && transform.hide) ? 0 : minSize / transform.fontSize;

                const el = select(this).select('text');
                setTransormAndDisplay(el, transform);
            }
        });
    }
}

function recordMinTextSize(traceType: string, transform: any, fullLayout: FullLayout): void {
    if(fullLayout.uniformtext.mode) {
        const minKey = getMinKey(traceType);
        const minSize = fullLayout.uniformtext.minsize;
        const size = transform.scale * transform.fontSize;

        transform.hide = size < minSize;

        fullLayout[minKey] = fullLayout[minKey] || Infinity;
        if(!transform.hide) {
            fullLayout[minKey] = Math.min(
                fullLayout[minKey],
                Math.max(size, minSize)
            );
        }
    }
}

function clearMinTextSize(traceType: string, fullLayout: FullLayout): void {
    const minKey = getMinKey(traceType);
    fullLayout[minKey] = undefined;
}

function getMinKey(traceType: string): string {
    return '_' + traceType + 'Text_minsize';
}

export default {
    recordMinTextSize: recordMinTextSize,
    clearMinTextSize: clearMinTextSize,
    resizeText: resizeText
};
