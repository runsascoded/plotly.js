import Lib from '../../lib/index.js';

function format(vRounded) {
    return (
        vRounded.indexOf('e') !== -1 ? vRounded.replace(/[.]?0+e/, 'e') :
        vRounded.indexOf('.') !== -1 ? vRounded.replace(/[.]?0+$/, '') :
        vRounded
    );
}

export var formatPiePercent = function formatPiePercent(v, separators) {
    var vRounded = format((v * 100).toPrecision(3));
    return Lib.numSeparate(vRounded, separators) + '%';
};

export var formatPieValue = function formatPieValue(v, separators) {
    var vRounded = format(v.toPrecision(10));
    return Lib.numSeparate(vRounded, separators);
};

export var getFirstFilled = function getFirstFilled(array, indices) {
    if(!Lib.isArrayOrTypedArray(array)) return;
    for(var i = 0; i < indices.length; i++) {
        var v = array[indices[i]];
        if(v || v === 0 || v === '') return v;
    }
};

export var castOption = function castOption(item, indices) {
    if(Lib.isArrayOrTypedArray(item)) return getFirstFilled(item, indices);
    else if(item) return item;
};

export var getRotationAngle = function(rotation) {
    return (rotation === 'auto' ? 0 : rotation) * Math.PI / 180;
};

export default { formatPiePercent, formatPieValue, getFirstFilled, castOption, getRotationAngle };
