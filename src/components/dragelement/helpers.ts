export var selectMode = function(dragmode: string): boolean {
    return (
        dragmode === 'lasso' ||
        dragmode === 'select'
    );
};

export var drawMode = function(dragmode: string): boolean {
    return (
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle'
    );
};

export var openMode = function(dragmode: string): boolean {
    return (
        dragmode === 'drawline' ||
        dragmode === 'drawopenpath'
    );
};

export var rectMode = function(dragmode: string): boolean {
    return (
        dragmode === 'select' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle'
    );
};

export var freeMode = function(dragmode: string): boolean {
    return (
        dragmode === 'lasso' ||
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath'
    );
};

export var selectingOrDrawing = function(dragmode: string): boolean {
    return (freeMode(dragmode) || rectMode(dragmode));
};

export default { selectMode, drawMode, openMode, rectMode, freeMode, selectingOrDrawing };
