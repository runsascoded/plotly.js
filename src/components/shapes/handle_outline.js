function clearOutlineControllers(gd) {
    const zoomLayer = gd._fullLayout._zoomlayer;
    if (zoomLayer) {
        zoomLayer.selectAll('.outline-controllers').remove();
    }
}
function clearOutline(gd) {
    const zoomLayer = gd._fullLayout._zoomlayer;
    if (zoomLayer) {
        // until we get around to persistent selections, remove the outline
        // here. The selection itself will be removed when the plot redraws
        // at the end.
        zoomLayer.selectAll('.select-outline').remove();
    }
    gd._fullLayout._outlining = false;
}
export default {
    clearOutlineControllers: clearOutlineControllers,
    clearOutline: clearOutline
};
