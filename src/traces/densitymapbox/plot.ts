import convert from './convert.js';
import _constants from '../../plots/mapbox/constants.js';
const { traceLayerPrefix: LAYER_PREFIX } = _constants;

function DensityMapbox(this: any, subplot: any, uid: any) {
    this.type = 'densitymapbox';
    this.subplot = subplot;
    this.uid = uid;

    this.sourceId = 'source-' + uid;

    this.layerList = [
        ['heatmap', LAYER_PREFIX + uid + '-heatmap']
    ];

    // previous 'below' value,
    // need this to update it properly
    this.below = null;
}

const proto = DensityMapbox.prototype;

proto.update = function(calcTrace: any) {
    const subplot = this.subplot;
    const layerList = this.layerList;
    const optsAll = convert(calcTrace);
    const below = subplot.belowLookup['trace-' + this.uid];

    subplot.map
        .getSource(this.sourceId)
        .setData(optsAll.geojson);

    if(below !== this.below) {
        this._removeLayers();
        this._addLayers(optsAll, below);
        this.below = below;
    }

    for(let i = 0; i < layerList.length; i++) {
        const item = layerList[i];
        const k = item[0];
        const id = item[1];
        const opts = (optsAll as any)[k];

        subplot.setOptions(id, 'setLayoutProperty', opts.layout);

        if(opts.layout.visibility === 'visible') {
            subplot.setOptions(id, 'setPaintProperty', opts.paint);
        }
    }
};

proto._addLayers = function(optsAll: any, below: any) {
    const subplot = this.subplot;
    const layerList = this.layerList;
    const sourceId = this.sourceId;

    for(let i = 0; i < layerList.length; i++) {
        const item = layerList[i];
        const k = item[0];
        const opts = optsAll[k];

        subplot.addLayer({
            type: k,
            id: item[1],
            source: sourceId,
            layout: opts.layout,
            paint: opts.paint
        }, below);
    }
};

proto._removeLayers = function() {
    const map = this.subplot.map;
    const layerList = this.layerList;

    for(let i = layerList.length - 1; i >= 0; i--) {
        map.removeLayer(layerList[i][1]);
    }
};

proto.dispose = function() {
    const map = this.subplot.map;
    this._removeLayers();
    map.removeSource(this.sourceId);
};

export default function createDensityMapbox(subplot: any, calcTrace: any) {
    const trace = calcTrace[0].trace;
    // @ts-ignore TS7009
    const densityMapbox: any = (new DensityMapbox(subplot, trace.uid) as any);
    const sourceId = densityMapbox.sourceId;
    const optsAll = convert(calcTrace);
    const below = densityMapbox.below = subplot.belowLookup['trace-' + trace.uid];

    subplot.map.addSource(sourceId, {
        type: 'geojson',
        data: optsAll.geojson
    });

    densityMapbox._addLayers(optsAll, below);

    return densityMapbox;
}
