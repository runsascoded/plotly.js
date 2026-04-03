import Lib from '../../lib/index.js';
import convert from './convert.js';
import _constants from '../../plots/mapbox/constants.js';
const { traceLayerPrefix: LAYER_PREFIX } = _constants;
const ORDER = {
    cluster: ['cluster', 'clusterCount', 'circle'],
    nonCluster: ['fill', 'line', 'circle', 'symbol'],
};
function ScatterMapbox(subplot, uid, clusterEnabled, isHidden) {
    this.type = 'scattermapbox';
    this.subplot = subplot;
    this.uid = uid;
    this.clusterEnabled = clusterEnabled;
    this.isHidden = isHidden;
    this.sourceIds = {
        fill: 'source-' + uid + '-fill',
        line: 'source-' + uid + '-line',
        circle: 'source-' + uid + '-circle',
        symbol: 'source-' + uid + '-symbol',
        cluster: 'source-' + uid + '-circle',
        clusterCount: 'source-' + uid + '-circle',
    };
    this.layerIds = {
        fill: LAYER_PREFIX + uid + '-fill',
        line: LAYER_PREFIX + uid + '-line',
        circle: LAYER_PREFIX + uid + '-circle',
        symbol: LAYER_PREFIX + uid + '-symbol',
        cluster: LAYER_PREFIX + uid + '-cluster',
        clusterCount: LAYER_PREFIX + uid + '-cluster-count',
    };
    // We could merge the 'fill' source with the 'line' source and
    // the 'circle' source with the 'symbol' source if ever having
    // for up-to 4 sources per 'scattermapbox' traces becomes a problem.
    // previous 'below' value,
    // need this to update it properly
    this.below = null;
}
const proto = ScatterMapbox.prototype;
proto.addSource = function (k, opts, cluster) {
    const sourceOpts = {
        type: 'geojson',
        data: opts.geojson,
    };
    if (cluster && cluster.enabled) {
        Lib.extendFlat(sourceOpts, {
            cluster: true,
            clusterMaxZoom: cluster.maxzoom,
        });
    }
    const isSourceExists = this.subplot.map.getSource(this.sourceIds[k]);
    if (isSourceExists) {
        isSourceExists.setData(opts.geojson);
    }
    else {
        this.subplot.map.addSource(this.sourceIds[k], sourceOpts);
    }
};
proto.setSourceData = function (k, opts) {
    this.subplot.map
        .getSource(this.sourceIds[k])
        .setData(opts.geojson);
};
proto.addLayer = function (k, opts, below) {
    const source = {
        type: opts.type,
        id: this.layerIds[k],
        source: this.sourceIds[k],
        layout: opts.layout,
        paint: opts.paint,
    };
    if (opts.filter) {
        source.filter = opts.filter;
    }
    const currentLayerId = this.layerIds[k];
    let layerExist;
    const layers = this.subplot.getMapLayers();
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].id === currentLayerId) {
            layerExist = true;
            break;
        }
    }
    if (layerExist) {
        this.subplot.setOptions(currentLayerId, 'setLayoutProperty', source.layout);
        if (source.layout.visibility === 'visible') {
            this.subplot.setOptions(currentLayerId, 'setPaintProperty', source.paint);
        }
    }
    else {
        this.subplot.addLayer(source, below);
    }
};
proto.update = function update(calcTrace) {
    const trace = calcTrace[0].trace;
    const subplot = this.subplot;
    const map = subplot.map;
    const optsAll = convert(subplot.gd, calcTrace);
    const below = subplot.belowLookup['trace-' + this.uid];
    const hasCluster = !!(trace.cluster && trace.cluster.enabled);
    const hadCluster = !!this.clusterEnabled;
    const lThis = this;
    function addCluster(noSource) {
        if (!noSource)
            lThis.addSource('circle', optsAll.circle, trace.cluster);
        const order = ORDER.cluster;
        for (let i = 0; i < order.length; i++) {
            const k = order[i];
            const opts = optsAll[k];
            lThis.addLayer(k, opts, below);
        }
    }
    function removeCluster(noSource) {
        const order = ORDER.cluster;
        for (let i = order.length - 1; i >= 0; i--) {
            const k = order[i];
            map.removeLayer(lThis.layerIds[k]);
        }
        if (!noSource)
            map.removeSource(lThis.sourceIds.circle);
    }
    function addNonCluster(noSource) {
        const order = ORDER.nonCluster;
        for (let i = 0; i < order.length; i++) {
            const k = order[i];
            const opts = optsAll[k];
            if (!noSource)
                lThis.addSource(k, opts);
            lThis.addLayer(k, opts, below);
        }
    }
    function removeNonCluster(noSource) {
        const order = ORDER.nonCluster;
        for (let i = order.length - 1; i >= 0; i--) {
            const k = order[i];
            map.removeLayer(lThis.layerIds[k]);
            if (!noSource)
                map.removeSource(lThis.sourceIds[k]);
        }
    }
    function remove(noSource) {
        if (hadCluster)
            removeCluster(noSource);
        else
            removeNonCluster(noSource);
    }
    function add(noSource) {
        if (hasCluster)
            addCluster(noSource);
        else
            addNonCluster(noSource);
    }
    function repaint() {
        const order = hasCluster ? ORDER.cluster : ORDER.nonCluster;
        for (let i = 0; i < order.length; i++) {
            const k = order[i];
            const opts = optsAll[k];
            if (!opts)
                continue;
            subplot.setOptions(lThis.layerIds[k], 'setLayoutProperty', opts.layout);
            if (opts.layout.visibility === 'visible') {
                if (k !== 'cluster') {
                    lThis.setSourceData(k, opts);
                }
                subplot.setOptions(lThis.layerIds[k], 'setPaintProperty', opts.paint);
            }
        }
    }
    const wasHidden = this.isHidden;
    const isHidden = trace.visible !== true;
    if (isHidden) {
        if (!wasHidden)
            remove();
    }
    else if (wasHidden) {
        if (!isHidden)
            add();
    }
    else if (hadCluster !== hasCluster) {
        remove();
        add();
    }
    else if (this.below !== below) {
        remove(true);
        add(true);
        repaint();
    }
    else {
        repaint();
    }
    this.clusterEnabled = hasCluster;
    this.isHidden = isHidden;
    this.below = below;
    // link ref for quick update during selections
    calcTrace[0].trace._glTrace = this;
};
proto.dispose = function dispose() {
    const map = this.subplot.map;
    const order = this.clusterEnabled ? ORDER.cluster : ORDER.nonCluster;
    for (let i = order.length - 1; i >= 0; i--) {
        const k = order[i];
        map.removeLayer(this.layerIds[k]);
        map.removeSource(this.sourceIds[k]);
    }
};
export default function createScatterMapbox(subplot, calcTrace) {
    const trace = calcTrace[0].trace;
    const hasCluster = trace.cluster && trace.cluster.enabled;
    const isHidden = trace.visible !== true;
    // @ts-ignore TS7009
    const scatterMapbox = new ScatterMapbox(subplot, trace.uid, hasCluster, isHidden);
    const optsAll = convert(subplot.gd, calcTrace);
    const below = scatterMapbox.below = subplot.belowLookup['trace-' + trace.uid];
    let i, k, opts;
    if (hasCluster) {
        scatterMapbox.addSource('circle', optsAll.circle, trace.cluster);
        for (i = 0; i < ORDER.cluster.length; i++) {
            k = ORDER.cluster[i];
            opts = optsAll[k];
            scatterMapbox.addLayer(k, opts, below);
        }
    }
    else {
        for (i = 0; i < ORDER.nonCluster.length; i++) {
            k = ORDER.nonCluster[i];
            opts = optsAll[k];
            scatterMapbox.addSource(k, opts, trace.cluster);
            scatterMapbox.addLayer(k, opts, below);
        }
    }
    // link ref for quick update during selections
    calcTrace[0].trace._glTrace = scatterMapbox;
    return scatterMapbox;
}
