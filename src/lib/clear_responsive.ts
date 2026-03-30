export default function clearResponsive(gd: any): void {
    if(gd._responsiveChartHandler) {
        window.removeEventListener('resize', gd._responsiveChartHandler);
        delete gd._responsiveChartHandler;
    }
}
