import { useState, useCallback, useMemo } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'

declare const __PLOTLY_FIXED__: boolean
declare global {
  interface Window {
    Plotly: typeof import('plotly.js')
  }
}

// Create Plot component using window.Plotly (loaded via script tag)
const Plot = createPlotlyComponent(window.Plotly)

// Generate test data
const n = 100
const now = Date.now()
const timestamps = Array.from({ length: n }, (_, i) => new Date(now - (n - i) * 60 * 60 * 1000))
const tempData = Array.from({ length: n }, (_, i) => Math.sin(i / 10) * 5 + 22 + Math.random())
const co2Data = Array.from({ length: n }, (_, i) => Math.sin(i / 8) * 200 + 800 + Math.random() * 50)

function formatForPlotly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function App() {
  const [eventLog, setEventLog] = useState<string>('')

  const formattedTimestamps = useMemo(() =>
    timestamps.map(t => formatForPlotly(t)),
  [])

  const initialRange = useMemo((): [string, string] => {
    const latestTime = timestamps[timestamps.length - 1]
    const earliestTime = new Date(latestTime.getTime() - 24 * 60 * 60 * 1000)
    return [formatForPlotly(earliestTime), formatForPlotly(latestTime)]
  }, [])

  const [range, setRange] = useState<[string, string]>(initialRange)

  const { tickvals, ticktext } = useMemo(() => {
    const startTime = new Date(range[0])
    const endTime = new Date(range[1])
    const tickvals: string[] = []
    const ticktext: string[] = []

    const startHour = new Date(startTime)
    startHour.setMinutes(0, 0, 0)
    if (startHour < startTime) {
      startHour.setHours(startHour.getHours() + 2)
    }

    for (let tickTime = new Date(startHour); tickTime <= endTime; tickTime.setHours(tickTime.getHours() + 2)) {
      const tickHour = tickTime.getHours()
      const hour12 = tickHour === 0 ? 12 : tickHour > 12 ? tickHour - 12 : tickHour
      const ampm = tickHour < 12 ? 'am' : 'pm'
      tickvals.push(formatForPlotly(tickTime))
      ticktext.push(`${hour12}${ampm}`)
    }
    return { tickvals, ticktext }
  }, [range])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRelayout = useCallback((eventData: any) => {
    console.log('onRelayout:', eventData)
    if (eventData['xaxis.range[0]'] && eventData['xaxis.range[1]']) {
      const newRange: [string, string] = [
        eventData['xaxis.range[0]'],
        eventData['xaxis.range[1]']
      ]
      setRange(newRange)
      setEventLog(`range: ${newRange[0]} to ${newRange[1]}`)
    }
  }, [])

  // Traces WITH zorder - this triggers the bug in unfixed versions
  const traces = useMemo(() => [
    {
      x: formattedTimestamps,
      y: tempData,
      mode: 'lines' as const,
      line: { color: '#e74c3c', width: 2 },
      name: 'Temp (°C)',
      legendgroup: 'primary',
      zorder: 10,
    },
    {
      x: formattedTimestamps,
      y: co2Data,
      mode: 'lines' as const,
      line: { color: '#3498db', width: 2 },
      name: 'CO2 (ppm)',
      yaxis: 'y2' as const,
      legendgroup: 'secondary',
      zorder: 1,
    },
  ], [formattedTimestamps])

  const layout = {
    autosize: true,
    height: 400,
    xaxis: {
      type: 'date' as const,
      range: range,
      autorange: false,
      rangeslider: { visible: false },
      tickvals: tickvals,
      ticktext: ticktext,
      tickmode: 'array' as const,
    },
    yaxis: {
      fixedrange: true,
      side: 'left' as const,
      title: 'Temperature (°C)',
    },
    yaxis2: {
      fixedrange: true,
      side: 'right' as const,
      overlaying: 'y' as const,
      title: 'CO2 (ppm)',
    },
    dragmode: 'pan' as const,
    hovermode: 'x unified' as const,
    margin: { l: 60, r: 60, t: 30, b: 50 },
  }

  const config = {
    scrollZoom: true,
    displayModeBar: false,
    responsive: true,
  }

  const isFixed = __PLOTLY_FIXED__
  const plotlyVersion = window.Plotly?.version || 'unknown'

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto' }}>
      <div className={`version-badge ${isFixed ? 'fixed' : 'cdn'}`}>
        Plotly.js {plotlyVersion} {isFixed ? '(with fix)' : '(CDN)'}
      </div>

      <h1>
        <code>zorder</code> Pan Bug Demo
        {isFixed
          ? <span style={{ color: '#080', marginLeft: 10 }}>✓ FIXED</span>
          : <span style={{ color: '#c00', marginLeft: 10 }}>✗ BUG</span>
        }
      </h1>

      <p style={{ marginBottom: 20 }}>
        {isFixed ? (
          <>This version includes the fix. <strong>Pan works correctly on all drags, including the first.</strong></>
        ) : (
          <>
            <strong>Bug:</strong> When traces have <code>zorder</code> set, the <strong>first</strong> pan fails —
            traces freeze while grid lines move. Release and drag again: the <strong>second</strong> pan works correctly.
          </>
        )}
      </p>

      <Plot
        data={traces}
        layout={layout}
        config={config}
        useResizeHandler={true}
        style={{ width: '100%' }}
        onRelayout={handleRelayout}
      />

      <div style={{ fontFamily: 'monospace', marginTop: 20, padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
        {eventLog || 'Drag to pan. Watch console for relayout events.'}
      </div>

      <div style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
        <strong>Instructions:</strong>
        <ol style={{ marginTop: 5 }}>
          <li>Drag the chart to pan horizontally</li>
          {!isFixed && <li><strong>First drag:</strong> grid lines move but traces stay frozen</li>}
          {!isFixed && <li>Release mouse and drag again</li>}
          {!isFixed && <li><strong>Second drag:</strong> traces move correctly</li>}
          {isFixed && <li>All drags work correctly, including the first!</li>}
        </ol>
        <p style={{ marginTop: 15 }}>
          <a href="https://github.com/runsascoded/plotly.js/tree/fix-zorder-pan-dist/demo-src" style={{ color: '#0066cc' }}>
            View source on GitHub
          </a>
        </p>
      </div>
    </div>
  )
}
