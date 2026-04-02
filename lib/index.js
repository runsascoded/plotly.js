import Plotly from './core.js';
import bar_trace from "./bar.js";
import box_trace from "./box.js";
import heatmap_trace from "./heatmap.js";
import histogram_trace from "./histogram.js";
import histogram2d_trace from "./histogram2d.js";
import histogram2dcontour_trace from "./histogram2dcontour.js";
import contour_trace from "./contour.js";
import scatterternary_trace from "./scatterternary.js";
import violin_trace from "./violin.js";
import funnel_trace from "./funnel.js";
import waterfall_trace from "./waterfall.js";
import image_trace from "./image.js";
import pie_trace from "./pie.js";
import sunburst_trace from "./sunburst.js";
import treemap_trace from "./treemap.js";
import icicle_trace from "./icicle.js";
import funnelarea_trace from "./funnelarea.js";
import scatter3d_trace from "./scatter3d.js";
import surface_trace from "./surface.js";
import isosurface_trace from "./isosurface.js";
import volume_trace from "./volume.js";
import mesh3d_trace from "./mesh3d.js";
import cone_trace from "./cone.js";
import streamtube_trace from "./streamtube.js";
import scattergeo_trace from "./scattergeo.js";
import choropleth_trace from "./choropleth.js";
import scattergl_trace from "./scattergl.js";
import splom_trace from "./splom.js";
import parcoords_trace from "./parcoords.js";
import parcats_trace from "./parcats.js";
import scattermapbox_trace from "./scattermapbox.js";
import choroplethmapbox_trace from "./choroplethmapbox.js";
import densitymapbox_trace from "./densitymapbox.js";
import scattermap_trace from "./scattermap.js";
import choroplethmap_trace from "./choroplethmap.js";
import densitymap_trace from "./densitymap.js";
import sankey_trace from "./sankey.js";
import indicator_trace from "./indicator.js";
import table_trace from "./table.js";
import carpet_trace from "./carpet.js";
import scattercarpet_trace from "./scattercarpet.js";
import contourcarpet_trace from "./contourcarpet.js";
import ohlc_trace from "./ohlc.js";
import candlestick_trace from "./candlestick.js";
import scatterpolar_trace from "./scatterpolar.js";
import scatterpolargl_trace from "./scatterpolargl.js";
import barpolar_trace from "./barpolar.js";
import scattersmith_trace from "./scattersmith.js";
import calendars_trace from "./calendars.js";

Plotly.register([
    bar_trace, box_trace, heatmap_trace, histogram_trace,
    histogram2d_trace, histogram2dcontour_trace, contour_trace,
    scatterternary_trace, violin_trace, funnel_trace, waterfall_trace,
    image_trace, pie_trace, sunburst_trace, treemap_trace, icicle_trace,
    funnelarea_trace, scatter3d_trace, surface_trace, isosurface_trace,
    volume_trace, mesh3d_trace, cone_trace, streamtube_trace,
    scattergeo_trace, choropleth_trace, scattergl_trace, splom_trace,
    parcoords_trace, parcats_trace, scattermapbox_trace,
    choroplethmapbox_trace, densitymapbox_trace, scattermap_trace,
    choroplethmap_trace, densitymap_trace, sankey_trace,
    indicator_trace, table_trace, carpet_trace, scattercarpet_trace,
    contourcarpet_trace, ohlc_trace, candlestick_trace,
    scatterpolar_trace, scatterpolargl_trace, barpolar_trace,
    scattersmith_trace, calendars_trace,
]);

export default Plotly;
