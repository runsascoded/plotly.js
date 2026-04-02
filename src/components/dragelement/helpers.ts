export function selectMode(dragmode: string): boolean {
    return (
        dragmode === 'lasso' ||
        dragmode === 'select'
    );
}

export function drawMode(dragmode: string): boolean {
    return (
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle'
    );
}

export function openMode(dragmode: string): boolean {
    return (
        dragmode === 'drawline' ||
        dragmode === 'drawopenpath'
    );
}

export function rectMode(dragmode: string): boolean {
    return (
        dragmode === 'select' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle'
    );
}

export function freeMode(dragmode: string): boolean {
    return (
        dragmode === 'lasso' ||
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath'
    );
}

export function selectingOrDrawing(dragmode: string): boolean {
    return (freeMode(dragmode) || rectMode(dragmode));
}

export default { selectMode, drawMode, openMode, rectMode, freeMode, selectingOrDrawing };
