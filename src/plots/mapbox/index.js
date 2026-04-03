import mapboxgl from '@plotly/mapbox-gl/dist/mapbox-gl-unminified';
import Lib from '../../lib/index.js';
import { getSubplotCalcData } from '../../plots/get_data.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
import { select } from 'd3-selection';
import { bBox as drawingBBox } from '../../components/drawing/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import Mapbox from './mapbox.js';
import _req0 from './constants.js';
import _req1 from './layout_attributes.js';
import _req2 from './layout_defaults.js';
const strTranslate = Lib.strTranslate;
const strScale = Lib.strScale;
const MAPBOX = 'mapbox';
export const constants = _req0;
export const name = MAPBOX;
export const attr = 'subplot';
export const idRoot = MAPBOX;
export const idRegex = Lib.counterRegex(MAPBOX);
const deprecationWarning = [
    'mapbox subplots and traces are deprecated!',
    'Please consider switching to `map` subplots and traces.',
    'Learn more at: https://plotly.com/python/maplibre-migration/',
    'as well as https://plotly.com/javascript/maplibre-migration/'
].join(' ');
export const attributes = {
    subplot: {
        valType: 'subplotid',
        dflt: 'mapbox',
        editType: 'calc',
        description: [
            deprecationWarning,
            'Sets a reference between this trace\'s data coordinates and',
            'a mapbox subplot.',
            'If *mapbox* (the default value), the data refer to `layout.mapbox`.',
            'If *mapbox2*, the data refer to `layout.mapbox2`, and so on.'
        ].join(' ')
    }
};
export const layoutAttributes = _req1;
export const supplyLayoutDefaults = _req2;
let firstPlot = true;
export function plot(gd) {
    if (firstPlot) {
        firstPlot = false;
        Lib.warn(deprecationWarning);
    }
    const fullLayout = gd._fullLayout;
    const calcData = gd.calcdata;
    const mapboxIds = fullLayout._subplots[MAPBOX];
    if (mapboxgl.version !== constants.requiredVersion) {
        throw new Error(constants.wrongVersionErrorMsg);
    }
    const accessToken = findAccessToken(gd, mapboxIds);
    mapboxgl.accessToken = accessToken;
    for (let i = 0; i < mapboxIds.length; i++) {
        const id = mapboxIds[i];
        const subplotCalcData = getSubplotCalcData(calcData, MAPBOX, id);
        const opts = fullLayout[id];
        let mapbox = opts._subplot;
        if (!mapbox) {
            // @ts-ignore TS7009
            mapbox = new Mapbox(gd, id);
            fullLayout[id]._subplot = mapbox;
        }
        if (!mapbox.viewInitial) {
            mapbox.viewInitial = {
                center: Lib.extendFlat({}, opts.center),
                zoom: opts.zoom,
                bearing: opts.bearing,
                pitch: opts.pitch
            };
        }
        mapbox.plot(subplotCalcData, fullLayout, gd._promises);
    }
}
export function clean(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const oldMapboxKeys = oldFullLayout._subplots[MAPBOX] || [];
    for (let i = 0; i < oldMapboxKeys.length; i++) {
        const oldMapboxKey = oldMapboxKeys[i];
        if (!newFullLayout[oldMapboxKey] && !!oldFullLayout[oldMapboxKey]._subplot) {
            oldFullLayout[oldMapboxKey]._subplot.destroy();
        }
    }
}
export function toSVG(gd) {
    const fullLayout = gd._fullLayout;
    const subplotIds = fullLayout._subplots[MAPBOX];
    const size = fullLayout._size;
    for (let i = 0; i < subplotIds.length; i++) {
        const opts = fullLayout[subplotIds[i]];
        const domain = opts.domain;
        const mapbox = opts._subplot;
        const imageData = mapbox.toImage('png');
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
        // Append logo if visible
        const hidden = subplotDiv.select('.mapboxgl-ctrl-logo').node().offsetParent === null;
        if (!hidden) {
            const logo = fullLayout._glimages.append('g');
            logo.attr('transform', strTranslate(size.l + size.w * domain.x[0] + 10, size.t + size.h * (1 - domain.y[0]) - 31));
            logo.append('path')
                .attr('d', constants.mapboxLogo.path0)
                .style('opacity', 0.9)
                .style('fill', '#ffffff')
                .style('enable-background', 'new');
            logo.append('path')
                .attr('d', constants.mapboxLogo.path1)
                .style('opacity', 0.35)
                .style('enable-background', 'new');
            logo.append('path')
                .attr('d', constants.mapboxLogo.path2)
                .style('opacity', 0.35)
                .style('enable-background', 'new');
            logo.append('polygon')
                .attr('points', constants.mapboxLogo.polygon)
                .style('opacity', 0.9)
                .style('fill', '#ffffff')
                .style('enable-background', 'new');
        }
        // Add attributions
        const attributions = subplotDiv
            .select('.mapboxgl-ctrl-attrib').text()
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
        if ((bBox.width > maxWidth / 2)) {
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
        if ((bBox.width + 6) > maxWidth)
            scaleRatio = maxWidth / (bBox.width + 6);
        const offset = [(size.l + size.w * domain.x[1]), (size.t + size.h * (1 - domain.y[0]))];
        attributionGroup.attr('transform', strTranslate(offset[0], offset[1]) + strScale(scaleRatio));
    }
}
// N.B. mapbox-gl only allows one accessToken to be set per page:
// https://github.com/mapbox/mapbox-gl-js/issues/6331
function findAccessToken(gd, mapboxIds) {
    const fullLayout = gd._fullLayout;
    const context = gd._context;
    // special case for Mapbox Atlas users
    if (context.mapboxAccessToken === '')
        return '';
    const tokensUseful = [];
    const tokensListed = [];
    let hasOneSetMapboxStyle = false;
    let wontWork = false;
    // Take the first token we find in a mapbox subplot.
    // These default to the context value but may be overridden.
    for (let i = 0; i < mapboxIds.length; i++) {
        const opts = fullLayout[mapboxIds[i]];
        const token = opts.accesstoken;
        if (isStyleRequireAccessToken(opts.style)) {
            if (token) {
                Lib.pushUnique(tokensUseful, token);
            }
            else {
                if (isStyleRequireAccessToken(opts._input.style)) {
                    Lib.error('Uses Mapbox map style, but did not set an access token.');
                    hasOneSetMapboxStyle = true;
                }
                wontWork = true;
            }
        }
        if (token) {
            Lib.pushUnique(tokensListed, token);
        }
    }
    if (wontWork) {
        const msg = hasOneSetMapboxStyle ?
            constants.noAccessTokenErrorMsg :
            constants.missingStyleErrorMsg;
        Lib.error(msg);
        throw new Error(msg);
    }
    if (tokensUseful.length) {
        if (tokensUseful.length > 1) {
            Lib.warn(constants.multipleTokensErrorMsg);
        }
        return tokensUseful[0];
    }
    else {
        if (tokensListed.length) {
            Lib.log([
                'Listed mapbox access token(s)', tokensListed.join(','),
                'but did not use a Mapbox map style, ignoring token(s).'
            ].join(' '));
        }
        return '';
    }
}
function isStyleRequireAccessToken(s) {
    return typeof s === 'string' && (constants.styleValuesMapbox.indexOf(s) !== -1 ||
        s.indexOf('mapbox://') === 0 ||
        s.indexOf('stamen') === 0);
}
export function updateFx(gd) {
    const fullLayout = gd._fullLayout;
    const subplotIds = fullLayout._subplots[MAPBOX];
    for (let i = 0; i < subplotIds.length; i++) {
        const subplotObj = fullLayout[subplotIds[i]]._subplot;
        subplotObj.updateFx(fullLayout);
    }
}
export default { constants, name, attr, idRoot, idRegex, attributes, layoutAttributes, supplyLayoutDefaults, plot, clean, toSVG, updateFx };
