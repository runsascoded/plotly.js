/**
 * Core plotly.js type definitions.
 *
 * These define the shapes of the main objects that flow through plotly's
 * rendering pipeline: the graph div (gd), full layout, full trace, plot info,
 * and calc data. Previously these were undocumented — consumers and internal
 * code had to read the source to understand the shapes.
 */

import type { Selection } from 'd3-selection';

// ============================================================
// Graph Div (gd) — the DOM element + plotly state
// ============================================================

export interface GraphDiv extends HTMLDivElement {
    data: InputTrace[];
    layout: Partial<Layout>;
    _fullData: FullTrace[];
    _fullLayout: FullLayout;
    _transitionData?: TransitionData;
    calcdata: CalcData[];
    _context: PlotConfig;
    _promises: Promise<void>[];
    _ev?: EventEmitter;
    _internalEv?: EventEmitter;
    _dragging?: boolean;
    _dragged?: boolean;
    _editing?: boolean;
    _hoverdata?: any;
    _spikepoints?: any;
    _dragdata?: any;
    _hmpixcount?: number;
    _hmlumcount?: number;
    _transitioning?: boolean;
    _transitioningWithDuration?: boolean;
    _legendMouseDownTime?: number;
    on: (event: string, fn: (data: any) => void) => void;
    once: (event: string, fn: (data: any) => void) => void;
    removeListener: (event: string, fn: (data: any) => void) => void;
    removeAllListeners: (event?: string) => void;
    emit: (event: string, data?: any) => void;
}

// ============================================================
// Input types (user-provided)
// ============================================================

export interface InputTrace {
    type?: string;
    name?: string;
    visible?: boolean | 'legendonly';
    x?: any[];
    y?: any[];
    z?: any[];
    text?: string | string[];
    [key: string]: any;
}

export interface Layout {
    title?: string | { text: string; font?: Font; x?: number; y?: number };
    width?: number;
    height?: number;
    autosize?: boolean;
    font?: Partial<Font>;
    paper_bgcolor?: string;
    plot_bgcolor?: string;
    margin?: Partial<Margin>;
    xaxis?: Partial<AxisLayout>;
    yaxis?: Partial<AxisLayout>;
    showlegend?: boolean;
    legend?: Partial<LegendLayout>;
    [key: string]: any;
}

// ============================================================
// Full types (after supplyDefaults)
// ============================================================

export interface FullTrace extends InputTrace {
    _module: TraceModule;
    _fullInput: InputTrace;
    _fullData: FullTrace[];
    index: number;
    uid: string;
    _categories: Record<string, boolean>;
    _arrayAttrs: string[];
    [key: string]: any;
}

export interface FullLayout extends Layout {
    _size: LayoutSize;
    _paper: Selection<SVGSVGElement, unknown, null, undefined>;
    _toppaper: Selection<SVGSVGElement, unknown, null, undefined>;
    _paperdiv: Selection<HTMLDivElement, unknown, null, undefined>;
    _container: Selection<HTMLDivElement, unknown, null, undefined>;
    _hoverpaper: Selection<SVGSVGElement, unknown, null, undefined>;
    _bgLayer: Selection<SVGGElement, unknown, null, undefined>;
    _cartesianlayer: Selection<SVGGElement, unknown, null, undefined>;
    _draggers: Selection<SVGGElement, unknown, null, undefined>;
    _plots: Record<string, PlotInfo>;
    _subplots: SubplotIndex;
    _basePlotModules: BasePlotModule[];
    _modules: TraceModule[];
    _uid: string;
    _defs: Selection<SVGDefsElement, unknown, null, undefined>;
    _clips: Selection<SVGGElement, unknown, null, undefined>;
    _zindices: number[];
    _has: (category: string) => boolean;
    _insideTickLabelsUpdaterange?: Record<string, any>;
    modebar?: ModeBarLayout;
    shapes?: any[];
    annotations?: any[];
    images?: any[];
    [key: string]: any;
}

export interface LayoutSize {
    l: number;  // left margin
    r: number;  // right margin
    t: number;  // top margin
    b: number;  // bottom margin
    w: number;  // plot width
    h: number;  // plot height
    p: number;  // padding
}

export interface Margin {
    l: number;
    r: number;
    t: number;
    b: number;
    pad: number;
    autoexpand: boolean;
}

// ============================================================
// Plot info (per-subplot state)
// ============================================================

export interface PlotInfo {
    id: string;
    plotgroup: Selection<SVGGElement, unknown, null, undefined>;
    xaxis: FullAxis;
    yaxis: FullAxis;
    bg?: Selection<SVGRectElement, unknown, null, undefined>;
    clipRect?: Selection<SVGRectElement, unknown, null, undefined>;
    plot: Selection<SVGGElement, unknown, null, undefined>;
    mainplot?: PlotInfo;
    draglayer?: Selection<SVGGElement, unknown, null, undefined>;
    gridlayer: Selection<SVGGElement, unknown, null, undefined>;
    minorGridlayer: Selection<SVGGElement, unknown, null, undefined>;
    layerClipId: string | null;
    _hasClipOnAxisFalse?: boolean;
    [key: string]: any;
}

// ============================================================
// Axis
// ============================================================

export interface AxisLayout {
    type: 'linear' | 'log' | 'date' | 'category' | 'multicategory';
    title: string | { text: string; font?: Font };
    range: [number, number];
    autorange: boolean | 'reversed';
    domain: [number, number];
    [key: string]: any;
}

export interface FullAxis extends AxisLayout {
    _id: string;
    _name: string;
    _offset: number;
    _length: number;
    _anchorAxis?: FullAxis;
    _linepositions: Record<string, number>;
    _lw: number;
    _mainLinePosition: number;
    _mainMirrorPosition: number | null;
    _counterAxes: string[];
    _traceIndices: number[];
    r2d: (v: number) => number;
    d2r: (v: any) => number;
    c2p: (v: number, clip?: boolean) => number;
    p2c: (v: number) => number;
    [key: string]: any;
}

// ============================================================
// Calc data
// ============================================================

export interface CalcDatum {
    x: number;
    y: number;
    i: number;
    trace: FullTrace;
    [key: string]: any;
}

export type CalcData = CalcDatum[];

// ============================================================
// Module types
// ============================================================

export interface TraceModule {
    name: string;
    categories: Record<string, boolean>;
    basePlotModule: BasePlotModule;
    attributes: Record<string, any>;
    supplyDefaults: (traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) => void;
    calc: (gd: GraphDiv, trace: FullTrace) => CalcData;
    plot: (gd: GraphDiv, plotinfo: PlotInfo, cdModule: CalcData[], sel?: any, transitionOpts?: any, makeOnCompleteCallback?: any) => void;
    style?: (gd: GraphDiv, cd?: CalcData[]) => void;
    hoverPoints?: (pointData: any, xval: number, yval: number, hovermode: string) => any[];
    [key: string]: any;
}

export interface BasePlotModule {
    name: string;
    attr?: string[];
    plot?: (gd: GraphDiv, plotinfo?: PlotInfo, cdModule?: CalcData[]) => void;
    drawFramework?: (gd: GraphDiv) => void;
    clean?: (newFullData: FullTrace[], newFullLayout: FullLayout, oldFullData: FullTrace[], oldFullLayout: FullLayout) => void;
    [key: string]: any;
}

export interface ComponentModule {
    moduleType: 'component';
    name: string;
    layoutAttributes?: Record<string, any>;
    supplyLayoutDefaults?: (layoutIn: Layout, layoutOut: FullLayout) => void;
    draw?: (gd: GraphDiv) => void;
    [key: string]: any;
}

// ============================================================
// Supporting types
// ============================================================

export interface Font {
    family: string;
    size: number;
    color: string;
    weight?: number | string;
    style?: string;
    variant?: string;
    textcase?: string;
    lineposition?: string;
    shadow?: string;
}

export interface LegendLayout {
    x: number;
    y: number;
    font: Font;
    bgcolor: string;
    bordercolor: string;
    borderwidth: number;
    orientation: 'v' | 'h';
    [key: string]: any;
}

export interface ModeBarLayout {
    orientation: 'v' | 'h';
    bgcolor: string;
    color: string;
    activecolor: string;
    [key: string]: any;
}

export interface PlotConfig {
    responsive: boolean;
    displayModeBar: boolean | 'hover';
    displaylogo: boolean;
    scrollZoom: boolean | string;
    editable: boolean;
    staticPlot: boolean;
    deferAutoMargin?: boolean;
    setBackground: (gd: GraphDiv, color: string) => void;
    _hasZeroWidth?: boolean;
    _hasZeroHeight?: boolean;
    [key: string]: any;
}

export interface SubplotIndex {
    cartesian: string[];
    gl2d: string[];
    gl3d: string[];
    geo: string[];
    mapbox: string[];
    map: string[];
    polar: string[];
    ternary: string[];
    smith: string[];
    [key: string]: string[];
}

export interface TransitionData {
    _frames?: any[];
    _frameHash?: Record<string, any>;
    _counter?: number;
    [key: string]: any;
}

interface EventEmitter {
    _events: Record<string, Function | Function[]>;
    on(event: string, fn: Function): this;
    once(event: string, fn: Function): this;
    removeListener(event: string, fn: Function): this;
    removeAllListeners(event?: string): this;
    emit(event: string, data?: any): boolean;
}

// ============================================================
// createPlotly factory
// ============================================================

export interface CreatePlotlyOptions {
    traces?: TraceModule[];
    components?: ComponentModule[];
    Icons?: Record<string, any>;
    Snapshot?: any;
    PlotSchema?: any;
}

export interface PlotlyInstance {
    version: string;
    register: (modules: any) => void;
    newPlot: (gd: GraphDiv | string, data: InputTrace[], layout?: Partial<Layout>, config?: Partial<PlotConfig>) => Promise<GraphDiv>;
    react: (gd: GraphDiv | string, data: InputTrace[], layout?: Partial<Layout>, config?: Partial<PlotConfig>) => Promise<GraphDiv>;
    restyle: (gd: GraphDiv | string, update: any, traces?: number | number[]) => Promise<GraphDiv>;
    relayout: (gd: GraphDiv | string, update: any) => Promise<GraphDiv>;
    update: (gd: GraphDiv | string, dataUpdate: any, layoutUpdate: any, traces?: number | number[]) => Promise<GraphDiv>;
    redraw: (gd: GraphDiv | string) => Promise<GraphDiv>;
    purge: (gd: GraphDiv | string) => void;
    addTraces: (gd: GraphDiv | string, traces: InputTrace | InputTrace[], newIndices?: number | number[]) => Promise<GraphDiv>;
    deleteTraces: (gd: GraphDiv | string, indices: number | number[]) => Promise<GraphDiv>;
    moveTraces: (gd: GraphDiv | string, currentIndices: number | number[], newIndices?: number | number[]) => Promise<GraphDiv>;
    extendTraces: (gd: GraphDiv | string, update: any, indices: number | number[], maxPoints?: number) => Promise<GraphDiv>;
    prependTraces: (gd: GraphDiv | string, update: any, indices: number | number[], maxPoints?: number) => Promise<GraphDiv>;
    animate: (gd: GraphDiv | string, frameOrGroup: any, animationOpts?: any) => Promise<GraphDiv>;
    addFrames: (gd: GraphDiv | string, frames: any[], indices?: number[]) => Promise<GraphDiv>;
    deleteFrames: (gd: GraphDiv | string, indices: number[]) => Promise<GraphDiv>;
    setPlotConfig: (config: Partial<PlotConfig>) => void;
    Plots: {
        resize: (gd: GraphDiv | string) => Promise<GraphDiv>;
        graphJson: (gd: GraphDiv, dataonly?: boolean, mode?: string) => string;
    };
    Fx: {
        hover: (gd: GraphDiv, evt: any, subplot?: string) => void;
        unhover: (gd: GraphDiv, evt: any, subplot?: string) => void;
        loneHover: (hoverItem: any, opts: any) => any;
        loneUnhover: (containerOrSelection: any) => void;
    };
    Icons?: Record<string, any>;
    Snapshot?: any;
    PlotSchema?: any;
}
