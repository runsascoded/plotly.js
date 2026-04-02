import Lib from '../../lib/index.js';
import handleSubplotDefaults from '../subplot_defaults.js';
import handleArrayContainerDefaults from '../array_container_defaults.js';
import layoutAttributes from './layout_attributes.js';
import type { FullLayout, FullTrace } from '../../../types/core';

export default function supplyLayoutDefaults(layoutIn: any, layoutOut: FullLayout, fullData: FullTrace[]) {
    handleSubplotDefaults(layoutIn, layoutOut, fullData, {
        type: 'mapbox',
        attributes: layoutAttributes,
        handleDefaults: handleDefaults,
        partition: 'y',
        accessToken: layoutOut._mapboxAccessToken
    });
}

function handleDefaults(containerIn, containerOut, coerce, opts) {
    coerce('accesstoken', opts.accessToken);
    coerce('style');
    coerce('center.lon');
    coerce('center.lat');
    coerce('zoom');
    coerce('bearing');
    coerce('pitch');

    const west = coerce('bounds.west');
    const east = coerce('bounds.east');
    const south = coerce('bounds.south');
    const north = coerce('bounds.north');
    if(
        west === undefined ||
        east === undefined ||
        south === undefined ||
        north === undefined
    ) {
        delete containerOut.bounds;
    }

    handleArrayContainerDefaults(containerIn, containerOut, {
        name: 'layers',
        handleItemDefaults: handleLayerDefaults
    });

    // copy ref to input container to update 'center' and 'zoom' on map move
    containerOut._input = containerIn;
}

function handleLayerDefaults(layerIn, layerOut) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layerIn, layerOut, layoutAttributes.layers, attr, dflt);
    }

    const visible = coerce('visible');
    if(visible) {
        const sourceType = coerce('sourcetype');
        const mustBeRasterLayer = sourceType === 'raster' || sourceType === 'image';

        coerce('source');
        coerce('sourceattribution');

        if(sourceType === 'vector') {
            coerce('sourcelayer');
        }

        if(sourceType === 'image') {
            coerce('coordinates');
        }

        let typeDflt;
        if(mustBeRasterLayer) typeDflt = 'raster';

        let type = coerce('type', typeDflt);

        if(mustBeRasterLayer && type !== 'raster') {
            type = layerOut.type = 'raster';
            Lib.log('Source types *raster* and *image* must drawn *raster* layer type.');
        }

        coerce('below');
        coerce('color');
        coerce('opacity');
        coerce('minzoom');
        coerce('maxzoom');

        if(type === 'circle') {
            coerce('circle.radius');
        }

        if(type === 'line') {
            coerce('line.width');
            coerce('line.dash');
        }

        if(type === 'fill') {
            coerce('fill.outlinecolor');
        }

        if(type === 'symbol') {
            coerce('symbol.icon');
            coerce('symbol.iconsize');

            coerce('symbol.text');
            Lib.coerceFont(coerce, 'symbol.textfont', undefined, {
                noFontVariant: true,
                noFontShadow: true,
                noFontLineposition: true,
                noFontTextcase: true,
            });
            coerce('symbol.textposition');
            coerce('symbol.placement');
        }
    }
}
