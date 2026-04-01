import type { GraphDiv } from '../../types/core';

export default function clearResponsive(gd: GraphDiv): void {
    if(gd._responsiveChartHandler) {
        window.removeEventListener('resize', gd._responsiveChartHandler);
        delete gd._responsiveChartHandler;
    }
}
