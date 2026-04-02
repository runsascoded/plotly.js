import { isArrayOrTypedArray, numSeparate } from '../../lib/index.js';

function format(vRounded: string): string {
    return (
        vRounded.indexOf('e') !== -1 ? vRounded.replace(/[.]?0+e/, 'e') :
        vRounded.indexOf('.') !== -1 ? vRounded.replace(/[.]?0+$/, '') :
        vRounded
    );
}

export const formatPiePercent = function formatPiePercent(v: number, separators: string): string {
    const vRounded = format((v * 100).toPrecision(3));
    return numSeparate(vRounded, separators) + '%';
};

export const formatPieValue = function formatPieValue(v: number, separators: string): string {
    const vRounded = format(v.toPrecision(10));
    return numSeparate(vRounded, separators);
};

export const getFirstFilled = function getFirstFilled(array: any[], indices: number[]): any {
    if(!isArrayOrTypedArray(array)) return;
    for(let i = 0; i < indices.length; i++) {
        const v = array[indices[i]];
        if(v || v === 0 || v === '') return v;
    }
};

export const castOption = function castOption(item: any, indices: number[]): any {
    if(isArrayOrTypedArray(item)) return getFirstFilled(item, indices);
    else if(item) return item;
};

export const getRotationAngle = function(rotation: number | string): number {
    return (rotation === 'auto' ? 0 : rotation as number) * Math.PI / 180;
};

export default { formatPiePercent, formatPieValue, getFirstFilled, castOption, getRotationAngle };
