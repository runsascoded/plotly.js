#!/usr/bin/env node
/**
 * Build demo apps for bundle size comparison.
 * Each demo shows a different plot type with upstream vs fork.
 */
import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const demos = [
    {
        id: 'scatter-bar',
        title: 'Scatter + Bar',
        desc: 'Line chart with bar overlay',
        upstreamBundle: 'plotly-basic.min.js',
        factoryCode: `
import { createPlotly } from '../../src/core-factory.js';
import scatter from '../../src/traces/scatter/index.js';
import bar from '../../src/traces/bar/index.js';
import legend from '../../src/components/legend/index.js';
var Plotly = createPlotly({ traces: [scatter, bar], components: [legend] });
`,
        plotCode: `
Plotly.newPlot(el, [
    { x: [1,2,3,4,5,6], y: [10,15,13,17,22,19], type: 'scatter', name: 'Trend' },
    { x: [1,2,3,4,5,6], y: [16,5,11,9,14,12], type: 'bar', name: 'Volume' },
], { title: 'Scatter + Bar', width: 800, height: 400 });`,
    },
    {
        id: 'pie',
        title: 'Pie Chart',
        desc: 'Pie chart with labels',
        upstreamBundle: 'plotly-basic.min.js',
        factoryCode: `
import { createPlotly } from '../../src/core-factory.js';
import pie from '../../src/traces/pie/index.js';
import legend from '../../src/components/legend/index.js';
var Plotly = createPlotly({ traces: [pie], components: [legend] });
`,
        plotCode: `
Plotly.newPlot(el, [{
    type: 'pie',
    labels: ['Residential', 'Commercial', 'Industrial', 'Transport', 'Other'],
    values: [35, 25, 20, 15, 5],
    textinfo: 'label+percent',
    hole: 0.3,
}], { title: 'Energy Usage by Sector', width: 800, height: 400 });`,
    },
    {
        id: 'histogram',
        title: 'Histogram',
        desc: 'Distribution histogram',
        upstreamBundle: 'plotly.min.js',
        factoryCode: `
import { createPlotly } from '../../src/core-factory.js';
import histogram from '../../src/traces/histogram/index.js';
import legend from '../../src/components/legend/index.js';
var Plotly = createPlotly({ traces: [histogram], components: [legend] });
`,
        plotCode: `
function seededRandom(seed) { return function() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }; }
var rng = seededRandom(42);
var x1 = [], x2 = [];
for(var i = 0; i < 500; i++) { x1.push(rng() * 6 - 3); x2.push(rng() * 4 - 1); }
Plotly.newPlot(el, [
    { x: x1, type: 'histogram', name: 'Sample A', opacity: 0.6 },
    { x: x2, type: 'histogram', name: 'Sample B', opacity: 0.6 },
], { title: 'Distribution Comparison', barmode: 'overlay', width: 800, height: 400 });`,
    },
    {
        id: 'heatmap',
        title: 'Heatmap',
        desc: 'Color-mapped grid',
        upstreamBundle: 'plotly.min.js',
        factoryCode: `
import { createPlotly } from '../../src/core-factory.js';
import heatmap from '../../src/traces/heatmap/index.js';
var Plotly = createPlotly({ traces: [heatmap], components: [] });
`,
        plotCode: `
var z = [];
for(var i = 0; i < 20; i++) { z[i] = []; for(var j = 0; j < 20; j++) z[i][j] = Math.sin(i/3) * Math.cos(j/3); }
Plotly.newPlot(el, [{ z: z, type: 'heatmap', colorscale: 'Viridis' }],
    { title: 'Heatmap', width: 800, height: 400 });`,
    },
    {
        id: 'box',
        title: 'Box Plot',
        desc: 'Statistical box plots',
        upstreamBundle: 'plotly.min.js',
        factoryCode: `
import { createPlotly } from '../../src/core-factory.js';
import box from '../../src/traces/box/index.js';
import legend from '../../src/components/legend/index.js';
var Plotly = createPlotly({ traces: [box], components: [legend] });
`,
        plotCode: `
function seededRandom(seed) { return function() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }; }
var rng = seededRandom(99);
var y1 = [], y2 = [];
for(var i = 0; i < 200; i++) { y1.push(rng() * 10 + 5); y2.push(rng() * rng() * 20); }
Plotly.newPlot(el, [
    { y: y1, type: 'box', name: 'Normal' },
    { y: y2, type: 'box', name: 'Skewed' },
], { title: 'Box + Violin', width: 800, height: 400 });`,
    },
];

const upstreamPath = join(root, 'perf/bundle-compare/upstream/plotly-basic.min.js');
if(!existsSync(upstreamPath)) {
    console.error('Missing upstream bundle — run perf/bundle-compare/compare.mjs first');
    process.exit(1);
}

const results = [];

for(const demo of demos) {
    const dir = join(__dirname, demo.id);
    mkdirSync(dir, { recursive: true });

    // Build upstream
    const upBundle = join(root, 'perf/bundle-compare/upstream', demo.upstreamBundle);
    const isFullUpstream = demo.upstreamBundle === 'plotly.min.js';
    const upLabel = isFullUpstream ? 'Upstream full v3.3.1' : 'Upstream basic v3.3.1';
    const upApp = `
var el = document.createElement('div');
document.body.appendChild(el);
import Plotly from '${upBundle.replace(/\\/g, '/')}';
${demo.plotCode}
`;
    const upResult = buildSync({
        stdin: { contents: upApp, resolveDir: root, loader: 'js' },
        bundle: true, format: 'iife', write: false, minify: true, platform: 'browser',
        define: { 'process.env.NODE_ENV': '"production"', 'global': 'window' },
        loader: { '.css': 'empty' }, external: ['stream'],
    });
    writeFileSync(join(dir, 'upstream.js'), upResult.outputFiles[0].contents);
    const upKB = Math.round(upResult.outputFiles[0].contents.length / 1024);

    // Build fork — rewrite relative paths to absolute
    const forkImports = demo.factoryCode
        .replace(/from '\.\.\/\.\.\/src\//g, `from '${root}/src/`)
        .replace(/from '\.\.\/\.\.\/lib\//g, `from '${root}/lib/`);
    const forkApp = `
var el = document.createElement('div');
document.body.appendChild(el);
${forkImports}
${demo.plotCode}
`;
    const forkResult = buildSync({
        stdin: { contents: forkApp, resolveDir: root, loader: 'js' },
        bundle: true, format: 'iife', write: false, minify: true, platform: 'browser',
        define: { 'process.env.NODE_ENV': '"production"', 'global': 'window' },
        loader: { '.css': 'empty' },
    });
    writeFileSync(join(dir, 'fork.js'), forkResult.outputFiles[0].contents);
    const forkKB = Math.round(forkResult.outputFiles[0].contents.length / 1024);

    const savings = Math.round((upKB - forkKB) / upKB * 100);
    results.push({ ...demo, upKB, forkKB, savings, upLabel, isFullUpstream });

    // Write per-demo HTML
    for(const variant of ['upstream', 'fork']) {
        const isUpstream = variant === 'upstream';
        const kb = isUpstream ? upKB : forkKB;
        writeFileSync(join(dir, variant + '.html'), `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${demo.title} — ${isUpstream ? 'upstream' : 'fork'}</title>
<style>
body { margin: 0; font-family: system-ui, sans-serif; background: #fafafa; }
.header { padding: 12px 20px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.header h2 { margin: 0 0 4px; font-size: 16px; }
.header .meta { color: #666; font-size: 13px; }
.header .size { font-weight: 600; }
${!isUpstream ? '.header .savings { color: #2e7d32; font-weight: 600; }' : ''}
</style></head><body>
<div class="header">
  <h2>${isUpstream ? upLabel : 'Fork factory (tree-shaken)'}</h2>
  <div class="meta">${demo.desc} &middot; <span class="size">${kb} KB</span>${!isUpstream ? ` <span class="savings">(-${savings}%)</span>` : ''}</div>
</div>
<script src="${variant}.js"></script>
</body></html>`);
    }

    console.log(`${demo.id.padEnd(15)} upstream: ${String(upKB).padStart(5)} KB   fork: ${String(forkKB).padStart(5)} KB   savings: -${savings}%`);
}

// Write main index — all plot types stacked with side-by-side iframes
const rows = results.map(r => `
    <tr>
      <td><a href="#${r.id}">${r.title}</a></td>
      <td class="num">${r.upKB} KB${r.isFullUpstream ? ' *' : ''}</td>
      <td class="num">${r.forkKB} KB</td>
      <td class="num green">-${r.savings}%</td>
      <td><a href="${r.id}/upstream.html">upstream</a> · <a href="${r.id}/fork.html">fork</a></td>
    </tr>`).join('');

const compareSections = results.map(r => `
<div class="section" id="${r.id}">
  <div class="section-header">
    <span class="section-title">${r.title}</span>
    <span class="section-meta">${r.desc} &middot; upstream ${r.upKB} KB vs fork ${r.forkKB} KB
      <span class="green">(-${r.savings}%)</span></span>
  </div>
  <div class="compare">
    <iframe src="${r.id}/upstream.html"></iframe>
    <iframe src="${r.id}/fork.html"></iframe>
  </div>
</div>`).join('\n');

writeFileSync(join(__dirname, 'index.html'), `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>plotly.js fork — bundle size comparison</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; overflow-x: hidden; }
.header { padding: 24px 20px; text-align: center; background: #fff; border-bottom: 1px solid #ddd; }
.header h1 { margin: 0 0 8px; font-size: 22px; }
.header p { margin: 0 auto; color: #666; max-width: 700px; line-height: 1.5; font-size: 14px; }
.header a { color: #1976d2; }
table { margin: 20px auto; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th { background: #f0f0f0; padding: 10px 16px; text-align: left; font-size: 13px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
td { padding: 10px 16px; border-top: 1px solid #eee; font-size: 14px; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
td.green { color: #2e7d32; font-weight: 600; }
td a { color: #1976d2; }
.section { max-width: 1200px; margin: 24px auto; }
.section-header { display: flex; align-items: baseline; gap: 12px; padding: 0 4px 8px; }
.section-title { font-size: 16px; font-weight: 600; }
.section-meta { font-size: 13px; color: #666; }
.green { color: #2e7d32; font-weight: 600; }
.compare { display: flex; height: 480px; gap: 1px; background: #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.compare iframe { flex: 1; border: none; }
.note { text-align: center; margin: 30px auto 40px; max-width: 700px; font-size: 13px; color: #999; line-height: 1.6; padding: 0 20px; }
.note a { color: #1976d2; }
</style></head><body>
<div class="header">
  <h1>plotly.js fork: bundle size comparison</h1>
  <p>
    <a href="https://github.com/runsascoded/plotly.js">ESM + TypeScript + d3 v7 fork</a> with
    tree-shakeable <code>createPlotly()</code> factory vs.
    <a href="https://www.npmjs.com/package/plotly.js-basic-dist-min/v/3.3.1">upstream v3.3.1</a>.
    Each plot imports only the traces it needs — upstream always ships everything.
  </p>
</div>

<table>
  <tr><th>Plot type</th><th>Upstream</th><th>Fork</th><th>Savings</th><th>Standalone</th></tr>
  ${rows}
</table>

${compareSections}

<div class="note">
  Fork: ESM (971 files), d3 v7, TypeScript (835 files),
  <code>createPlotly()</code> factory, decoupled components, inlined deps.<br>
  More savings planned: registration system removal, monolithic file splitting.
  <a href="https://github.com/runsascoded/plotly.js/blob/main/specs/modernization-roadmap.md">Roadmap</a>
</div>
</body></html>`);

console.log('\nDemo built in demo/');
