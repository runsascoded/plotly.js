/**
 * Minimal React reproducer for the bar-fill staleness bug
 * (`specs/bar-stale-fill-on-react-trace-count-drop.md`).
 *
 * Sequence:
 *   - First mount: `Plotly.newPlot` with View A's traces (3 bars + 1 scatter,
 *     "cyan/orange/purple" fills).
 *   - Button click: state updates → useEffect runs `Plotly.react` with View B
 *     (2 bars + 1 scatter, "red/green" fills, different trace names).
 *
 * Bug: the 2 new bar traces are rendered into the SVG <path>s of the
 * previous render's bars 0–1, but the inline `style="fill:..."` stays at
 * View A's cyan/orange. `gd.data`, `gd._fullData`, and
 * `gd.calcdata[i][0].trace.marker.color` all show View B's red/green.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Plotly from 'plotly.js/basic';

type View = 'A' | 'B';

interface ViewConfig {
    data: any[];
    layout: any;
}

const X = ['x'];

// Distinct, well-separated colors so the test can disambiguate stale vs fresh.
const COLOR_A1 = '#19d3f3'; // cyan
const COLOR_A2 = '#FFA15A'; // orange
const COLOR_A3 = '#ab63fa'; // purple

const COLOR_B1 = '#EF553B'; // red
const COLOR_B2 = '#00cc96'; // green

function viewA(): ViewConfig {
    return {
        data: [
            { type: 'bar', name: 'A1', x: X, y: [1], marker: { color: COLOR_A1 } },
            { type: 'bar', name: 'A2', x: X, y: [2], marker: { color: COLOR_A2 } },
            { type: 'bar', name: 'A3', x: X, y: [3], marker: { color: COLOR_A3 } },
            { type: 'scatter', name: 'L', x: X, y: [4], mode: 'lines' },
        ],
        layout: {
            autosize: true,
            barmode: 'stack',
            showlegend: true,
        },
    };
}

function viewB(): ViewConfig {
    return {
        // 4 → 3 traces (count change), with new bar names + marker.colors.
        data: [
            { type: 'bar', name: 'B1', x: X, y: [1], marker: { color: COLOR_B1 } },
            { type: 'bar', name: 'B2', x: X, y: [2], marker: { color: COLOR_B2 } },
            { type: 'scatter', name: 'L', x: X, y: [4], mode: 'lines' },
        ],
        layout: {
            autosize: true,
            barmode: 'stack',
            showlegend: true,
        },
    };
}

function App() {
    const [view, setView] = useState<View>('A');
    const plotRef = useRef<HTMLDivElement | null>(null);
    const initRef = useRef(false);

    const cfg: ViewConfig = view === 'A' ? viewA() : viewB();

    useEffect(() => {
        const div = plotRef.current;
        if (!div) return;
        const PMod = (Plotly as any).default || Plotly;
        if (!initRef.current) {
            initRef.current = true;
            PMod.newPlot(div, cfg.data, cfg.layout, { displayModeBar: false }).then(() => {
                (window as any).__pltDiv = div;
                (window as any).__expectedB = { B1: COLOR_B1, B2: COLOR_B2 };
                (window as any).__expectedA = { A1: COLOR_A1, A2: COLOR_A2, A3: COLOR_A3 };
            });
        } else {
            PMod.react(div, cfg.data, cfg.layout, { displayModeBar: false });
        }
    }, [cfg.data, cfg.layout]);

    return (
        <div>
            <div className="toolbar">
                <button data-view="A" onClick={() => setView('A')} disabled={view === 'A'}>View A (3 bars: cyan/orange/purple)</button>
                <button data-view="B" onClick={() => setView('B')} disabled={view === 'B'}>View B (2 bars: red/green)</button>
                <span className="info">current: {view}</span>
            </div>
            <div ref={plotRef} className="plot" />
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
