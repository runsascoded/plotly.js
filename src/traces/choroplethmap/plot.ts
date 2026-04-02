import _convert from './convert.js';
const { convert, convertOnSelect } = _convert;
import _constants from '../../plots/map/constants.js';
const { traceLayerPrefix: LAYER_PREFIX } = _constants;

function ChoroplethMap(subplot, uid) {
    this.type = 'choroplethmap';
    this.subplot = subplot;
    this.uid = uid;

    // N.B. fill and line layers share same source
    this.sourceId = 'source-' + uid;

    this.layerList = [
        ['fill', LAYER_PREFIX + uid + '-fill'],
        ['line', LAYER_PREFIX + uid + '-line']
    ];

    // previous 'below' value,
    // need this to update it properly
    this.below = null;
}

const proto = ChoroplethMap.prototype;

proto.update = function(calcTrace) {
    this._update(convert(calcTrace));

    // link ref for quick update during selections
    calcTrace[0].trace._glTrace = this;
};

proto.updateOnSelect = function(calcTrace) {
    this._update(convertOnSelect(calcTrace));
};

proto._update = function(optsAll) {
    const subplot = this.subplot;
    const layerList = this.layerList;
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
        const opts = optsAll[k];

        subplot.setOptions(id, 'setLayoutProperty', opts.layout);

        if(opts.layout.visibility === 'visible') {
            subplot.setOptions(id, 'setPaintProperty', opts.paint);
        }
    }
};

proto._addLayers = function(optsAll, below) {
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

export default function createChoroplethMap(subplot, calcTrace) {
    const trace = calcTrace[0].trace;
    const choroplethMap = new ChoroplethMap(subplot, trace.uid);
    const sourceId = choroplethMap.sourceId;
    const optsAll = convert(calcTrace);
    const below = choroplethMap.below = subplot.belowLookup['trace-' + trace.uid];

    subplot.map.addSource(sourceId, {
        type: 'geojson',
        data: optsAll.geojson
    });

    choroplethMap._addLayers(optsAll, below);

    // link ref for quick update during selections
    calcTrace[0].trace._glTrace = choroplethMap;

    return choroplethMap;
}
