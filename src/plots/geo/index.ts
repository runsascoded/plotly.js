import { getSubplotCalcData } from '../../plots/get_data.js';
import _index from '../../lib/index.js';
const { counterRegex } = _index;
import createGeo from './geo.js';
import _req0 from './layout_attributes.js';
import _req1 from './layout_defaults.js';
import type { FullLayout, FullTrace, GraphDiv } from '../../../types/core';

const GEO = 'geo';
const counter = counterRegex(GEO);

const attributes: any = {};
attributes[GEO] = {
    valType: 'subplotid',
    dflt: GEO,
    editType: 'calc',
    description: [
        'Sets a reference between this trace\'s geospatial coordinates and',
        'a geographic map.',
        'If *geo* (the default value), the geospatial coordinates refer to',
        '`layout.geo`.',
        'If *geo2*, the geospatial coordinates refer to `layout.geo2`,',
        'and so on.'
    ].join(' ')
};

function plotGeo(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const calcData = gd.calcdata;
    const geoIds = fullLayout._subplots[GEO];

    for(let i = 0; i < geoIds.length; i++) {
        const geoId = geoIds[i];
        const geoCalcData = getSubplotCalcData(calcData, GEO, geoId);
        const geoLayout = fullLayout[geoId];
        let geo = geoLayout._subplot;

        if(!geo) {
            geo = createGeo({
                id: geoId,
                graphDiv: gd,
                container: fullLayout._geolayer.node(),
                topojsonURL: gd._context.topojsonURL,
                staticPlot: gd._context.staticPlot
            });

            fullLayout[geoId]._subplot = geo;
        }

        geo.plot(geoCalcData, fullLayout, gd._promises);
    }
}

function clean(newFullData: FullTrace[], newFullLayout: FullLayout, oldFullData: FullTrace[], oldFullLayout: FullLayout) {
    const oldGeoKeys = oldFullLayout._subplots[GEO] || [];

    for(let i = 0; i < oldGeoKeys.length; i++) {
        const oldGeoKey = oldGeoKeys[i];
        const oldGeo = oldFullLayout[oldGeoKey]._subplot;

        if(!newFullLayout[oldGeoKey] && !!oldGeo) {
            oldGeo.framework.remove();
            oldGeo.clipDef.remove();
        }
    }
}

function updateFx(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const subplotIds = fullLayout._subplots[GEO];

    for(let i = 0; i < subplotIds.length; i++) {
        const subplotLayout = fullLayout[subplotIds[i]];
        const subplotObj = subplotLayout._subplot;
        subplotObj.updateFx(fullLayout, subplotLayout);
    }
}

export default {
    attr: GEO,
    name: GEO,
    idRoot: GEO,
    idRegex: counter,
    attrRegex: counter,
    attributes: attributes,
    layoutAttributes: _req0,
    supplyLayoutDefaults: _req1,
    plot: plotGeo,
    updateFx: updateFx,
    clean: clean
};
