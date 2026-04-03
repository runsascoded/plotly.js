export function selectMode(dragmode) {
    return (dragmode === 'lasso' ||
        dragmode === 'select');
}
export function drawMode(dragmode) {
    return (dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle');
}
export function openMode(dragmode) {
    return (dragmode === 'drawline' ||
        dragmode === 'drawopenpath');
}
export function rectMode(dragmode) {
    return (dragmode === 'select' ||
        dragmode === 'drawline' ||
        dragmode === 'drawrect' ||
        dragmode === 'drawcircle');
}
export function freeMode(dragmode) {
    return (dragmode === 'lasso' ||
        dragmode === 'drawclosedpath' ||
        dragmode === 'drawopenpath');
}
export function selectingOrDrawing(dragmode) {
    return (freeMode(dragmode) || rectMode(dragmode));
}
export default { selectMode, drawMode, openMode, rectMode, freeMode, selectingOrDrawing };
