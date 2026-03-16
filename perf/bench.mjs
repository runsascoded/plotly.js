#!/usr/bin/env node
/**
 * Automated performance benchmark for plotly.js.
 *
 * Usage:
 *   node perf/bench.mjs [--basic] [--headed]
 *
 * Starts a local server, builds the plotly bundle, runs each plot definition
 * in a headless Chromium via Playwright, collects timing + transfer metrics,
 * asserts against thresholds, and outputs a JSON report.
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const useBasic = args.includes('--basic');
const headed = args.includes('--headed');
const bundleName = useBasic ? 'basic' : 'minimal';

// Start server
function startServer() {
    return new Promise((resolve, reject) => {
        const serverArgs = [join(__dirname, 'server.mjs')];
        if(useBasic) serverArgs.push('--basic');

        const proc = spawn('node', serverArgs, {
            stdio: ['ignore', 'pipe', 'inherit'],
        });

        let portData = '';
        proc.stdout.on('data', (chunk) => {
            portData += chunk.toString();
            const lines = portData.split('\n');
            for(const line of lines) {
                const port = parseInt(line.trim(), 10);
                if(port > 0) {
                    resolve({ proc, port });
                    return;
                }
            }
        });

        proc.on('error', reject);
        proc.on('exit', (code) => {
            if(code) reject(new Error(`Server exited with code ${code}`));
        });
    });
}

async function runBench() {
    console.log(`\nPlotly.js Performance Benchmark (${bundleName} bundle)\n${'='.repeat(50)}\n`);

    // Start server
    console.log('Starting server...');
    const { proc: server, port } = await startServer();
    const baseUrl = `http://localhost:${port}`;

    // Load thresholds
    const thresholds = JSON.parse(await readFile(join(__dirname, 'thresholds.json'), 'utf-8'));

    // Get plot names from plots.js
    const plots = await import(join(__dirname, 'plots.js'));
    const plotNames = Object.keys(plots).filter(k =>
        k !== 'default' && k !== '__esModule' && k !== 'module' && !k.startsWith('__')
        && typeof plots[k] === 'object' && plots[k].data
    );

    // Launch browser
    const browser = await chromium.launch({ headless: !headed });
    const results = [];
    const failures = [];

    // Measure bundle transfer size
    let bundleTransferSize = 0;

    for(const plotName of plotNames) {
        const context = await browser.newContext();
        const page = await context.newPage();

        let totalTransfer = 0;
        const transfers = [];

        page.on('response', async (response) => {
            const url = new URL(response.url());
            if(url.origin !== baseUrl) return;
            const headers = response.headers();
            const contentLength = parseInt(headers['content-length'] || '0', 10);
            totalTransfer += contentLength;
            transfers.push({
                path: url.pathname,
                size: contentLength,
            });
            if(url.pathname === '/plotly.js') {
                bundleTransferSize = contentLength;
            }
        });

        page.on('console', (msg) => {
            if(msg.type() === 'error') console.log(`    [console.error] ${msg.text()}`);
        });
        page.on('pageerror', (err) => {
            console.log(`    [pageerror] ${err.message}`);
        });

        const navStart = Date.now();
        await page.goto(`${baseUrl}/?plot=${plotName}`, { waitUntil: 'domcontentloaded' });

        // Wait for plot to finish rendering (window.__PLOTLY_PERF__ is set)
        await page.waitForFunction('window.__PLOTLY_PERF__', { timeout: 30000 });
        const navEnd = Date.now();

        const perf = await page.evaluate(() => window.__PLOTLY_PERF__);

        if(perf.error) {
            console.log(`  ${plotName}: ERROR - ${perf.error}`);
            failures.push({ plot: plotName, error: perf.error });
            await context.close();
            continue;
        }

        const result = {
            plot: plotName,
            bundle: bundleName,
            wallTime: perf.wallTime,
            navigationTime: navEnd - navStart,
            measures: perf.measures,
            transfers,
            totalTransfer,
        };
        results.push(result);

        // Format measures for display
        const measureStr = perf.measures
            .map(m => `${m.name.replace('plotly-', '')}: ${m.duration}ms`)
            .join(', ');

        console.log(`  ${plotName}: ${perf.wallTime}ms wall, ${(totalTransfer / 1024).toFixed(0)} KB transferred`);
        console.log(`    ${measureStr}`);

        // Check render time threshold
        const renderThreshold = thresholds.renderTime[plotName];
        if(renderThreshold && perf.wallTime > renderThreshold.max_ms) {
            const msg = `${plotName}: render time ${perf.wallTime}ms exceeds threshold ${renderThreshold.max_ms}ms`;
            console.log(`    FAIL: ${msg}`);
            failures.push({ plot: plotName, error: msg });
        }

        await context.close();
    }

    // Check bundle transfer size threshold
    const sizeThreshold = thresholds.transferSize[bundleName];
    const bundleKB = Math.round(bundleTransferSize / 1024);
    console.log(`\nBundle: ${bundleName}, ${bundleKB} KB`);
    if(sizeThreshold && bundleKB > sizeThreshold.max_kb) {
        const msg = `${bundleName} bundle: ${bundleKB} KB exceeds threshold ${sizeThreshold.max_kb} KB`;
        console.log(`  FAIL: ${msg}`);
        failures.push({ error: msg });
    }

    // Write report
    const report = {
        bundle: bundleName,
        bundleSize: bundleTransferSize,
        results,
        failures,
        timestamp: new Date().toISOString(),
    };

    await mkdir(join(__dirname, 'results'), { recursive: true });
    const reportPath = join(__dirname, 'results', `${bundleName}-${Date.now()}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport: ${reportPath}`);

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    if(failures.length) {
        console.log(`FAILED: ${failures.length} threshold(s) exceeded`);
        for(const f of failures) {
            console.log(`  - ${f.error}`);
        }
    } else {
        console.log('PASSED: all thresholds met');
    }

    // Cleanup
    await browser.close();
    server.kill();

    process.exit(failures.length ? 1 : 0);
}

runBench().catch((err) => {
    console.error('Bench failed:', err);
    process.exit(2);
});
