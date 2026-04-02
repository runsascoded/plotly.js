#!/usr/bin/env node
/**
 * Smoke test: verify all dist bundles load in a browser and Plotly.newPlot works.
 * Run after `npm run build` to verify bundles aren't broken.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const bundles = [
    'plotly.min.js',
    'basic.min.js',
    'cartesian.min.js',
    'geo.min.js',
    'gl3d.min.js',
    'gl2d.min.js',
    'map.min.js',
    'finance.min.js',
    'lite.min.js',
    'minimal.min.js',
];

const failures = [];
const browser = await chromium.launch({ headless: true });

for(const bundleName of bundles) {
    const bundlePath = join(distDir, bundleName);
    if(!existsSync(bundlePath)) {
        console.log(`  skip ${bundleName} (not built)`);
        continue;
    }

    const js = await readFile(bundlePath);
    const html = `<!DOCTYPE html>
<html><body><div id="plot"></div>
<script src="/bundle.js"></script>
<script>
try {
    Plotly.newPlot('plot', [{x:[1,2,3], y:[4,5,6]}])
        .then(() => { document.title = 'OK'; })
        .catch(e => { document.title = 'ERR:' + e.message; });
} catch(e) {
    document.title = 'ERR:' + e.message;
}
</script></body></html>`;

    const server = createServer((req, res) => {
        if(req.url === '/bundle.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript', 'Content-Length': js.length });
            res.end(js);
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        }
    });

    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`http://localhost:${port}`);
    await page.waitForTimeout(3000);
    const title = await page.title();

    if(title === 'OK' && errors.length === 0) {
        console.log(`  ✓ ${bundleName} (${(js.length / 1024).toFixed(0)} KB)`);
    } else {
        const reason = errors[0] || title || 'unknown';
        console.log(`  ✗ ${bundleName}: ${reason}`);
        failures.push(bundleName);
    }

    await page.close();
    server.close();
}

await browser.close();

console.log('');
if(failures.length) {
    console.log(`FAILED: ${failures.length} bundles broken`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
} else {
    console.log('PASSED: all dist bundles work');
}
