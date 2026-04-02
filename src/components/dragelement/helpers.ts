export const selectMode = function(dragmode: string): boolean {
    return (
        dragmode === 'lasso' ||
        dragmode === 'select'
    );
};

export const drawMode = function(dragmode: string): boolean {
    return (
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle'
    );
};

export const openMode = function(dragmode: string): boolean {
    return (
        dragmode === 'drawline' ||
        dragmode === 'drawopenpath'
    );
};

export const rectMode = function(dragmode: string): boolean {
    return (
        dragmode === 'select' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle'
    );
};

export const freeMode = function(dragmode: string): boolean {
    return (
        dragmode === 'lasso' ||
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath'
    );
};

export const selectingOrDrawing = function(dragmode: string): boolean {
    return (freeMode(dragmode) || rectMode(dragmode));
};

export default { selectMode, drawMode, openMode, rectMode, freeMode, selectingOrDrawing };
