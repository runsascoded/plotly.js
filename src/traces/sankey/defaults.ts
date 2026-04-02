import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import Color from '../../components/color/index.js';
import tinycolor from 'tinycolor2';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import handleHoverLabelDefaults from '../../components/fx/hoverlabel_defaults.js';
import Template from '../../plot_api/plot_template.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): any {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const hoverlabelDefault = Lib.extendDeep(layout.hoverlabel, traceIn.hoverlabel);

    // node attributes
    const nodeIn = traceIn.node;
    const nodeOut = Template.newContainer(traceOut, 'node');

    function coerceNode(attr: string, dflt?: any) {
        return Lib.coerce(nodeIn, nodeOut, attributes.node, attr, dflt);
    }
    coerceNode('label');
    coerceNode('groups');
    coerceNode('x');
    coerceNode('y');
    coerceNode('pad');
    coerceNode('thickness');
    coerceNode('line.color');
    coerceNode('line.width');
    coerceNode('hoverinfo', traceIn.hoverinfo);
    handleHoverLabelDefaults(nodeIn, nodeOut, coerceNode, hoverlabelDefault);
    coerceNode('hovertemplate');
    coerceNode('align');

    const colors = layout.colorway;

    const defaultNodePalette = (i: any) => {return colors[i % colors.length];};

    coerceNode('color', nodeOut.label.map((d: any, i: any) => Color.addOpacity(defaultNodePalette(i), 0.8)));
    coerceNode('customdata');

    // link attributes
    const linkIn = traceIn.link || {};
    const linkOut = Template.newContainer(traceOut, 'link');

    function coerceLink(attr: string, dflt?: any) {
        return Lib.coerce(linkIn, linkOut, attributes.link, attr, dflt);
    }
    coerceLink('label');
    coerceLink('arrowlen');
    coerceLink('source');
    coerceLink('target');
    coerceLink('value');
    coerceLink('line.color');
    coerceLink('line.width');
    coerceLink('hoverinfo', traceIn.hoverinfo);
    handleHoverLabelDefaults(linkIn, linkOut, coerceLink, hoverlabelDefault);
    coerceLink('hovertemplate');

    const darkBG = tinycolor(layout.paper_bgcolor).getLuminance() < 0.333;
    const defaultLinkColor = darkBG ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.2)';
    const linkColor = coerceLink('color', defaultLinkColor);

    function makeDefaultHoverColor(_linkColor: any) {
        let tc = tinycolor(_linkColor);
        if(!tc.isValid()) {
            // hopefully the user-specified color is valid, but if not that can be caught elsewhere
            return _linkColor;
        }
        const alpha = tc.getAlpha();
        if(alpha <= 0.8) {
            tc.setAlpha(alpha + 0.2);
        } else {
            tc = darkBG ? tc.brighten() : tc.darken();
        }
        return tc.toRgbString();
    }

    coerceLink('hovercolor', Array.isArray(linkColor) ?
        linkColor.map(makeDefaultHoverColor) :
        makeDefaultHoverColor(linkColor)
    );

    coerceLink('customdata');

    handleArrayContainerDefaults(linkIn, linkOut, {
        name: 'colorscales',
        handleItemDefaults: concentrationscalesDefaults
    });

    handleDomainDefaults(traceOut, layout, coerce);

    coerce('orientation');
    coerce('valueformat');
    coerce('valuesuffix');

    let dfltArrangement;
    if(nodeOut.x.length && nodeOut.y.length) {
        dfltArrangement = 'freeform';
    }
    coerce('arrangement', dfltArrangement);

    Lib.coerceFont(coerce, 'textfont', layout.font, { autoShadowDflt: true });

    // disable 1D transforms - arrays here are 1D but their lengths/meanings
    // don't match, between nodes and links
    traceOut._length = null;
}

function concentrationscalesDefaults(In: any, Out: any) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(In, Out, attributes.link.colorscales, attr, dflt);
    }

    coerce('label');
    coerce('cmin');
    coerce('cmax');
    coerce('colorscale');
}
