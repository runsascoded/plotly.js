/**
 * Minimal React reproducer for the `Plotly.react` legend/axis stale-redraw
 * bug. Mirrors the trigger pattern from ctbk's `<Plot>` (pltly):
 *
 * - First mount calls `Plotly.newPlot`.
 * - Subsequent renders (state change) call `Plotly.react` from a `useEffect`
 *   keyed on `[data, layout]`.
 * - Each "view" has a different trace count AND a different `uirevision`,
 *   so we test the spec's exact scenario.
 *
 * Layout shape mimics ctbk's `buildLayout`:
 *   `barmode: 'stack'`, `hovermode: 'x unified'`, `showlegend: true`,
 *   per-axis `yaxis.uirevision`, explicit `xaxis.range`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Plotly from 'plotly.js/basic';

type View = 'A' | 'B';

interface ViewConfig {
    data: any[];
    layout: any;
}

const xs = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];

// ctbk's stackPercents flow flips two yaxis attrs together: View A has no
// explicit range/tickformat (autorange + numeric ticks), View B has
// `range: [0, 1.01]` + `tickformat: '.0%'` (percent ticks, fixed range).
// Reproducing that dual flip alongside the trace-count change.
function viewA(): ViewConfig {
    return {
        data: [
            // The colon in `uid` is the trigger: cleanPlot runs
            //   `oldFullLayout._infolayer.select('.cb' + oldUid).remove()`
            // and unescaped, '.cbbar:' is an invalid CSS selector → throws,
            // aborting supplyDefaults mid-flight on the next Plotly.react.
            { type: 'bar', name: 'Rides', uid: 'bar:', x: xs, y: [10, 20, 30, 25, 22, 18] },
            { type: 'scatter', name: '12mo avg', uid: 'rollavg:total', x: xs, y: [15, 18, 22, 24, 23, 21] },
        ],
        layout: {
            autosize: true,
            barmode: 'stack',
            hovermode: 'x unified',
            showlegend: true,
            uirevision: 'rev-A',
            legend: { orientation: 'h', x: 0.5, xanchor: 'center', yanchor: 'top' },
            xaxis: { type: 'date', range: ['2023-12-15', '2024-06-15'] },
            yaxis: { automargin: true, fixedrange: true, uirevision: 'yrev-A' },
        },
    };
}

function viewB(): ViewConfig {
    return {
        data: [
            { type: 'bar', name: 'Classic',  uid: 'classic',  x: xs, y: [0.4, 0.5, 0.55, 0.5, 0.45, 0.4] },
            { type: 'bar', name: 'Electric', uid: 'electric', x: xs, y: [0.6, 0.5, 0.45, 0.5, 0.55, 0.6] },
            { type: 'scatter', name: 'Classic (12mo)',  uid: 'c12', x: xs, y: [0.42, 0.48, 0.52, 0.5, 0.47, 0.42] },
            { type: 'scatter', name: 'Electric (12mo)', uid: 'e12', x: xs, y: [0.58, 0.52, 0.48, 0.5, 0.53, 0.58] },
        ],
        layout: {
            autosize: true,
            barmode: 'stack',
            hovermode: 'x unified',
            showlegend: true,
            uirevision: 'rev-B',
            legend: { orientation: 'h', x: 0.5, xanchor: 'center', yanchor: 'top' },
            xaxis: { type: 'date', range: ['2023-12-15', '2024-06-15'] },
            yaxis: {
                automargin: true,
                fixedrange: true,
                uirevision: 'yrev-B',
                range: [0, 1.01],
                tickformat: '.0%',
            },
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
            });
        } else {
            PMod.react(div, cfg.data, cfg.layout, { displayModeBar: false });
        }
    }, [cfg.data, cfg.layout]);

    return (
        <div>
            <div className="toolbar">
                <button data-view="A" onClick={() => setView('A')} disabled={view === 'A'}>View A (2 traces, uirev rev-A)</button>
                <button data-view="B" onClick={() => setView('B')} disabled={view === 'B'}>View B (4 traces, uirev rev-B)</button>
                <span className="info">current: {view}</span>
            </div>
            <div ref={plotRef} className="plot" />
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
