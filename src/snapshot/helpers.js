import Registry from '../registry.js';

export var getDelay = function(fullLayout) {
    if(!fullLayout._has) return 0;

    return (
        fullLayout._has('gl3d') ||
        fullLayout._has('mapbox') ||
        fullLayout._has('map')
    ) ? 500 : 0;
};

export var getRedrawFunc = function(gd) {
    return function() {
        Registry.getComponentMethod('colorbar', 'draw')(gd);
    };
};

export var encodeSVG = function(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

export var encodeJSON = function(json) {
    return 'data:application/json,' + encodeURIComponent(json);
};

var DOM_URL = window.URL || window.webkitURL;

export var createObjectURL = function(blob) {
    return DOM_URL.createObjectURL(blob);
};

export var revokeObjectURL = function(url) {
    return DOM_URL.revokeObjectURL(url);
};

export var createBlob = function(url, format) {
    if(format === 'svg') {
        return new window.Blob([url], {type: 'image/svg+xml;charset=utf-8'});
    } else if(format === 'full-json') {
        return new window.Blob([url], {type: 'application/json;charset=utf-8'});
    } else {
        var binary = fixBinary(window.atob(url));
        return new window.Blob([binary], {type: 'image/' + format});
    }
};

export var octetStream = function(s) {
    document.location.href = 'data:application/octet-stream' + s;
};

// Taken from https://bl.ocks.org/nolanlawson/0eac306e4dac2114c752
function fixBinary(b) {
    var len = b.length;
    var buf = new ArrayBuffer(len);
    var arr = new Uint8Array(buf);
    for(var i = 0; i < len; i++) {
        arr[i] = b.charCodeAt(i);
    }
    return buf;
}

export var IMAGE_URL_PREFIX = /^data:image\/\w+;base64,/;

export default { getDelay, getRedrawFunc, encodeSVG, encodeJSON, createObjectURL, revokeObjectURL, createBlob, octetStream, IMAGE_URL_PREFIX };
