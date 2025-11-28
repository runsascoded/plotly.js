import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const plotlySrc = process.env.VITE_PLOTLY_SRC || 'cdn'

// Plotly.js URLs
const PLOTLY_CDN = 'https://cdn.plot.ly/plotly-3.3.0.min.js'
const PLOTLY_FIXED = '/plotly.js/dist/plotly.min.js'

const plotlyUrl = plotlySrc === 'local' ? PLOTLY_FIXED : PLOTLY_CDN
const isFixed = plotlySrc === 'local'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-plotly',
      transformIndexHtml(html) {
        // Inject plotly script and version indicator
        return html.replace(
          '</head>',
          `  <script src="${plotlyUrl}"></script>
    <style>
      .version-badge {
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
      }
      .version-badge.cdn { background: #fee; color: #c00; border: 1px solid #c00; }
      .version-badge.fixed { background: #efe; color: #080; border: 1px solid #080; }
    </style>
  </head>`
        )
      },
    },
  ],
  define: {
    __PLOTLY_FIXED__: JSON.stringify(isFixed),
  },
})
