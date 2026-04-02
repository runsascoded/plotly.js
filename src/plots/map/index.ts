import Lib from '../../lib/index.js';
import { getSubplotCalcData } from '../get_data.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
import { select } from 'd3-selection';
import { bBox as drawingBBox } from '../../components/drawing/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import Map from './map.js';
import _req0 from './layout_attributes.js';
import _req1 from './layout_defaults.js';
import type { GraphDiv } from '../../../types/core';
const strTranslate = Lib.strTranslate;
const strScale = Lib.strScale;

const MAP = 'map';

export const name = MAP;
export const attr = 'subplot';
export const idRoot = MAP;
export const idRegex = Lib.counterRegex(MAP);

export const attributes = {
    subplot: {
        valType: 'subplotid',
        dflt: 'map',
        editType: 'calc',
        description: [
            'Sets a reference between this trace\'s data coordinates and',
            'a map subplot.',
            'If *map* (the default value), the data refer to `layout.map`.',
            'If *map2*, the data refer to `layout.map2`, and so on.'
        ].join(' ')
    }
};

export const layoutAttributes = _req0;
export const supplyLayoutDefaults = _req1;

export const plot = function plot(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const calcData = gd.calcdata;
    const mapIds = fullLayout._subplots[MAP];

    for(let i = 0; i < mapIds.length; i++) {
        const id = mapIds[i];
        const subplotCalcData = getSubplotCalcData(calcData, MAP, id);
        const opts = fullLayout[id];
        let map = opts._subplot;

        if(!map) {
            // @ts-ignore TS7009
            map = (new Map(gd, id) as any);
            fullLayout[id]._subplot = map;
        }

        if(!map.viewInitial) {
            map.viewInitial = {
                center: Lib.extendFlat({}, opts.center),
                zoom: opts.zoom,
                bearing: opts.bearing,
                pitch: opts.pitch
            };
        }

        map.plot(subplotCalcData, fullLayout, gd._promises);
    }
};

export const clean = function(newFullData: any, newFullLayout: any, oldFullData: any, oldFullLayout: any) {
    const oldMapKeys = oldFullLayout._subplots[MAP] || [];

    for(let i = 0; i < oldMapKeys.length; i++) {
        const oldMapKey = oldMapKeys[i];

        if(!newFullLayout[oldMapKey] && !!oldFullLayout[oldMapKey]._subplot) {
            oldFullLayout[oldMapKey]._subplot.destroy();
        }
    }
};

export const toSVG = function(gd: any) {
    const fullLayout = gd._fullLayout;
    const subplotIds = fullLayout._subplots[MAP];
    const size = fullLayout._size;

    for(let i = 0; i < subplotIds.length; i++) {
        const opts = fullLayout[subplotIds[i]];
        const domain = opts.domain;
        const map = opts._subplot;

        const imageData = map.toImage('png');
        const image = fullLayout._glimages.append('svg:image');

        image
            .attr('xmlns', xmlnsNamespaces.svg)
            .attr('xlink:href', imageData)
            .attr('x', size.l + size.w * domain.x[0])
            .attr('y', size.t + size.h * (1 - domain.y[1]))
            .attr('width', size.w * (domain.x[1] - domain.x[0]))
            .attr('height', size.h * (domain.y[1] - domain.y[0]))
            .attr('preserveAspectRatio', 'none');

        const subplotDiv = select(opts._subplot.div);

        // Add attributions
        const attributions = subplotDiv
                              .select('.maplibregl-ctrl-attrib').text()
                              .replace('Improve this map', '');

        const attributionGroup = fullLayout._glimages.append('g');

        const attributionText = attributionGroup.append('text');
        attributionText
          .text(attributions)
          .classed('static-attribution', true)
          .attr('font-size', 12)
          .attr('font-family', 'Arial')
          .attr('color', 'rgba(0, 0, 0, 0.75)')
          .attr('text-anchor', 'end')
          .attr('data-unformatted', attributions);

        let bBox = drawingBBox(attributionText.node());

        // Break into multiple lines twice larger than domain
        const maxWidth = size.w * (domain.x[1] - domain.x[0]);
        if((bBox.width > maxWidth / 2)) {
            const multilineAttributions = attributions.split('|').join('<br>');
            attributionText
              .text(multilineAttributions)
              .attr('data-unformatted', multilineAttributions)
              .call(svgTextUtils.convertToTspans, gd);

            bBox = drawingBBox(attributionText.node());
        }
        attributionText.attr('transform', strTranslate(-3, -bBox.height + 8));

        // Draw white rectangle behind text
        attributionGroup
          .insert('rect', '.static-attribution')
          .attr('x', -bBox.width - 6)
          .attr('y', -bBox.height - 3)
          .attr('width', bBox.width + 6)
          .attr('height', bBox.height + 3)
          .attr('fill', 'rgba(255, 255, 255, 0.75)');

        // Scale down if larger than domain
        let scaleRatio = 1;
        if((bBox.width + 6) > maxWidth) scaleRatio = maxWidth / (bBox.width + 6);

        const offset = [(size.l + size.w * domain.x[1]), (size.t + size.h * (1 - domain.y[0]))];
        attributionGroup.attr('transform', strTranslate(offset[0], offset[1]) + strScale(scaleRatio));
    }
};

export const updateFx = function(gd: any) {
    const fullLayout = gd._fullLayout;
    const subplotIds = fullLayout._subplots[MAP];

    for(let i = 0; i < subplotIds.length; i++) {
        const subplotObj = fullLayout[subplotIds[i]]._subplot;
        subplotObj.updateFx(fullLayout);
    }
};

export default { name, attr, idRoot, idRegex, attributes, layoutAttributes, supplyLayoutDefaults, plot, clean, toSVG, updateFx };
