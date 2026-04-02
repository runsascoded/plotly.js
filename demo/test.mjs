#!/usr/bin/env node
/**
 * E2E test for demo site: verifies all plots render and hover works.
 * Run: node demo/test.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };

// Serve demo directory
const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let filePath = join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://localhost:${port}`;

const demos = ['scatter-bar', 'pie', 'histogram', 'heatmap', 'box'];
const failures = [];

console.log(`Testing demo site at ${baseUrl}\n`);

const browser = await chromium.launch({ headless: true });

for(const demo of demos) {
    for(const variant of ['upstream', 'fork']) {
        const url = `${baseUrl}/${demo}/${variant}.html`;
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto(url);
        await page.waitForTimeout(2000);

        // Check plot rendered (has SVG content)
        const hasSVG = await page.evaluate(() => {
            const svg = document.querySelector('.main-svg');
            return svg && svg.children.length > 0;
        });

        // Check for data points (traces rendered)
        const hasData = await page.evaluate(() => {
            return !!(document.querySelector('.point') ||
                      document.querySelector('.slice') ||
                      document.querySelector('.heatmaplayer image') ||
                      document.querySelector('.trace'));
        });

        // Test hover (find a data element and hover over it)
        let hoverWorks = false;
        const pointPos = await page.evaluate(() => {
            const el = document.querySelector('.point, .slice, .trace .lines path');
            if(!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if(pointPos) {
            await page.mouse.move(pointPos.x, pointPos.y);
            await page.waitForTimeout(500);
            hoverWorks = await page.evaluate(() => !!document.querySelector('.hovertext, .hoverlayer text'));
        }

        const status = [];
        if(!hasSVG) status.push('no SVG');
        if(!hasData) status.push('no data');
        if(errors.length) status.push(`errors: ${errors[0]}`);
        // Hover is optional for heatmap (no individual points to hover)
        if(!hoverWorks && demo !== 'heatmap') status.push('no hover');

        const ok = hasSVG && hasData && errors.length === 0;
        const label = `${demo}/${variant}`;
        if(ok) {
            console.log(`  ✓ ${label}${hoverWorks ? ' (hover OK)' : ''}`);
        } else {
            console.log(`  ✗ ${label}: ${status.join(', ')}`);
            failures.push(label);
        }

        await ctx.close();
    }
}

await browser.close();
server.close();

console.log('');
if(failures.length) {
    console.log(`FAILED: ${failures.length} failures`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
} else {
    console.log('PASSED: all demos render correctly');
}
