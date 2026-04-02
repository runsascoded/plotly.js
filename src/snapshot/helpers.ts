import Registry from '../registry.js';
import type { FullLayout, GraphDiv } from '../../types/core';

export const getDelay = function(fullLayout: FullLayout) {
    if(!fullLayout._has) return 0;

    return (
        fullLayout._has('gl3d') ||
        fullLayout._has('mapbox') ||
        fullLayout._has('map')
    ) ? 500 : 0;
};

export const getRedrawFunc = function(gd: GraphDiv) {
    return function() {
        Registry.getComponentMethod('colorbar', 'draw')(gd);
    };
};

export const encodeSVG = function(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

export const encodeJSON = function(json) {
    return 'data:application/json,' + encodeURIComponent(json);
};

const DOM_URL = window.URL || window.webkitURL;

export const createObjectURL = function(blob) {
    return DOM_URL.createObjectURL(blob);
};

export const revokeObjectURL = function(url) {
    return DOM_URL.revokeObjectURL(url);
};

export const createBlob = function(url, format) {
    if(format === 'svg') {
        return new window.Blob([url], {type: 'image/svg+xml;charset=utf-8'});
    } else if(format === 'full-json') {
        return new window.Blob([url], {type: 'application/json;charset=utf-8'});
    } else {
        const binary = fixBinary(window.atob(url));
        return new window.Blob([binary], {type: 'image/' + format});
    }
};

export const octetStream = function(s) {
    document.location.href = 'data:application/octet-stream' + s;
};

// Taken from https://bl.ocks.org/nolanlawson/0eac306e4dac2114c752
function fixBinary(b) {
    const len = b.length;
    const buf = new ArrayBuffer(len);
    const arr = new Uint8Array(buf);
    for(let i = 0; i < len; i++) {
        arr[i] = b.charCodeAt(i);
    }
    return buf;
}

export const IMAGE_URL_PREFIX = /^data:image\/\w+;base64,/;

export default { getDelay, getRedrawFunc, encodeSVG, encodeJSON, createObjectURL, revokeObjectURL, createBlob, octetStream, IMAGE_URL_PREFIX };
