import rgba from 'color-normalize';

function str2RgbaArray(color: string): number[] {
    if(!color) return [0, 0, 0, 1];
    return rgba(color);
}

export default str2RgbaArray;
