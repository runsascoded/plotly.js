import type { FullTrace, InputTrace } from '../../../types/core';
import { isArrayOrTypedArray, isPlainObject } from '../../lib/index.js';
import { isTypedArraySpec } from '../../lib/array.js';

export default {
    hasLines: function(trace: FullTrace) {
        return trace.visible && trace.mode &&
            trace.mode.indexOf('lines') !== -1;
    },

    hasMarkers: function(trace: FullTrace) {
        return trace.visible && (
            (trace.mode && trace.mode.indexOf('markers') !== -1) ||
            // until splom implements 'mode'
            trace.type === 'splom'
        );
    },

    hasText: function(trace: FullTrace) {
        return trace.visible && trace.mode &&
            trace.mode.indexOf('text') !== -1;
    },

    isBubble: function(trace: InputTrace | FullTrace) {
        var marker = trace.marker;
        return isPlainObject(marker) && (
            isArrayOrTypedArray(marker.size) ||
            isTypedArraySpec(marker.size)
        );
    }
};
