#!/usr/bin/env node
/**
 * Smoke test: verify ESM imports through lib/ work correctly.
 * Simulates what consumers do with `pds l` or `pds gh` (Vite/esbuild).
 *
 * Tests:
 * 1. lib/index-basic.js resolves and bundles
 * 2. lib/index-lite.js resolves and bundles
 * 3. lib/factory.js resolves and bundles
 * 4. Each renders a plot in a browser without errors
 */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const entries = [
    {
        name: 'basic (via lib/)',
        code: `
import Plotly from '${root}/lib/index-basic.js';
var el = document.createElement('div');
document.body.appendChild(el);
Plotly.newPlot(el, [{x:[1,2,3], y:[4,5,6], type:'scatter'}, {x:[1,2,3], y:[3,2,1], type:'bar'}], {width:600, height:400});
`,
    },
    {
        name: 'lite (via lib/)',
        code: `
import Plotly from '${root}/lib/index-lite.js';
var el = document.createElement('div');
document.body.appendChild(el);
Plotly.newPlot(el, [{x:[1,2,3], y:[4,5,6]}], {width:600, height:400});
`,
    },
    {
        name: 'factory (via lib/)',
        code: `
import { createPlotly } from '${root}/lib/factory.js';
import scatter from '${root}/src/traces/scatter/index';
import bar from '${root}/src/traces/bar/index';
import legend from '${root}/src/components/legend/index';
var Plotly = createPlotly({ traces: [scatter, bar], components: [legend] });
var el = document.createElement('div');
document.body.appendChild(el);
Plotly.newPlot(el, [{x:[1,2,3], y:[4,5,6]}, {x:[1,2,3], y:[3,2,1], type:'bar'}], {width:600, height:400});
`,
    },
];

const browser = await chromium.launch({ headless: true });
const failures = [];

console.log('Testing ESM imports through lib/\n');

for(const entry of entries) {
    let js;
    try {
        const result = await build({
            stdin: { contents: entry.code, resolveDir: root, loader: 'js' },
            bundle: true, format: 'iife', write: false, minify: false,
            platform: 'browser',
            define: { 'process.env.NODE_ENV': '"production"', 'global': 'window' },
            loader: { '.css': 'empty' },
        });
        js = result.outputFiles[0].contents;
    } catch(e) {
        console.log(`  ✗ ${entry.name}: BUILD FAILED — ${e.message.split('\n')[0]}`);
        failures.push(entry.name);
        continue;
    }

    const html = `<!DOCTYPE html><html><body>
<script>${Buffer.from(js).toString()}</script>
<script>
setTimeout(() => {
    var ok = !!document.querySelector('.main-svg');
    document.title = ok ? 'OK' : 'NO_SVG';
}, 2000);
</script></body></html>`;

    const server = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`http://localhost:${port}`);
    await page.waitForTimeout(3000);
    const title = await page.title();

    if(title === 'OK' && errors.length === 0) {
        console.log(`  ✓ ${entry.name} (${(js.length / 1024).toFixed(0)} KB)`);
    } else {
        const reason = errors[0] || title || 'unknown';
        console.log(`  ✗ ${entry.name}: ${reason}`);
        failures.push(entry.name);
    }

    await page.close();
    server.close();
}

await browser.close();

console.log('');
if(failures.length) {
    console.log(`FAILED: ${failures.length} ESM import tests failed`);
    process.exit(1);
} else {
    console.log('PASSED: all ESM imports work');
}
