#!/usr/bin/env node
/**
 * Automated performance benchmark for plotly.js.
 *
 * Usage:
 *   node perf/bench.mjs [--basic] [--headed] [--update]
 *
 * Starts a local server, builds the plotly bundle, runs each plot definition
 * in a headless Chromium via Playwright, collects timing + transfer metrics,
 * asserts against thresholds, and outputs a JSON report.
 *
 * Bundle size is asserted at the exact byte level. If the size changes, the
 * test fails and you must pass --update to accept the new size.
 *
 * Render times are asserted against generous max thresholds (catching gross
 * regressions only) and appended to a history file for trend analysis.
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const useBasic = args.includes('--basic');
const useLite = args.includes('--lite');
const headed = args.includes('--headed');
const update = args.includes('--update');
const minify = args.includes('--minify');
const defer = args.includes('--defer');
const bundleName = (useBasic ? 'basic' : useLite ? 'lite' : 'minimal') + (minify ? '-min' : '');

function startServer() {
    return new Promise((resolve, reject) => {
        const serverArgs = [join(__dirname, 'server.mjs')];
        if(useBasic) serverArgs.push('--basic');
        else if(useLite) serverArgs.push('--lite');
        if(minify) serverArgs.push('--minify');

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
    console.log(`\nPlotly.js Performance Benchmark (${bundleName} bundle)\n${'='.repeat(55)}\n`);

    console.log('Starting server...');
    const { proc: server, port } = await startServer();
    const baseUrl = `http://localhost:${port}`;

    const thresholdsPath = join(__dirname, 'thresholds.json');
    const thresholds = JSON.parse(await readFile(thresholdsPath, 'utf-8'));

    const plots = await import(join(__dirname, 'plots.cjs'));
    const plotNames = Object.keys(plots).filter(k =>
        k !== 'default' && k !== '__esModule' && k !== 'module' && !k.startsWith('__')
        && typeof plots[k] === 'object' && plots[k].data
    );

    const browser = await chromium.launch({ headless: !headed });
    const results = [];
    const failures = [];
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
            transfers.push({ path: url.pathname, size: contentLength });
            if(url.pathname === '/plotly.js') bundleTransferSize = contentLength;
        });

        page.on('console', (msg) => {
            if(msg.type() === 'error') console.log(`    [console.error] ${msg.text()}`);
        });
        page.on('pageerror', (err) => {
            console.log(`    [pageerror] ${err.message}`);
        });

        const navStart = Date.now();
        const plotUrl = `${baseUrl}/?plot=${plotName}${defer ? '&defer=1' : ''}`;
        await page.goto(plotUrl, { waitUntil: 'domcontentloaded' });
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

        const measureStr = perf.measures
            .map(m => `${m.name.replace('plotly-', '')}: ${m.duration}ms`)
            .join(', ');

        console.log(`  ${plotName}: ${perf.wallTime}ms wall, ${(totalTransfer / 1024).toFixed(0)} KB transferred`);
        console.log(`    ${measureStr}`);

        // Check render time threshold (generous, catches gross regressions)
        const renderThreshold = thresholds.renderTime[plotName];
        if(renderThreshold && perf.wallTime > renderThreshold.max_ms) {
            const msg = `${plotName}: render time ${perf.wallTime}ms exceeds max ${renderThreshold.max_ms}ms`;
            console.log(`    FAIL: ${msg}`);
            failures.push({ plot: plotName, error: msg });
        }

        await context.close();
    }

    // --- Bundle size: exact-byte assertion ---
    const sizeSpec = thresholds.bundleSize[bundleName];
    const expectedBytes = sizeSpec ? sizeSpec.expected_bytes : null;
    console.log(`\nBundle: ${bundleName}`);
    console.log(`  Size: ${bundleTransferSize.toLocaleString()} bytes (${(bundleTransferSize / 1024).toFixed(0)} KB)`);

    if(expectedBytes !== null && expectedBytes !== undefined) {
        if(bundleTransferSize !== expectedBytes) {
            const delta = bundleTransferSize - expectedBytes;
            const sign = delta > 0 ? '+' : '';
            const msg = `${bundleName} bundle size changed: expected ${expectedBytes.toLocaleString()} bytes, got ${bundleTransferSize.toLocaleString()} (${sign}${delta.toLocaleString()})`;

            if(update) {
                thresholds.bundleSize[bundleName].expected_bytes = bundleTransferSize;
                await writeFile(thresholdsPath, JSON.stringify(thresholds, null, 4) + '\n');
                console.log(`  UPDATED: ${msg}`);
                console.log(`  → thresholds.json updated to ${bundleTransferSize.toLocaleString()} bytes`);
            } else {
                console.log(`  FAIL: ${msg}`);
                console.log(`  → Run with --update to accept the new size`);
                failures.push({ error: msg });
            }
        } else {
            console.log(`  OK: matches expected ${expectedBytes.toLocaleString()} bytes`);
        }
    } else {
        console.log(`  (no expected size configured for ${bundleName})`);
    }

    // --- Write report ---
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

    // --- Append to render time history ---
    const historyPath = join(__dirname, 'results', `${bundleName}-history.jsonl`);
    const historyEntry = {
        timestamp: report.timestamp,
        bundleSize: bundleTransferSize,
        plots: Object.fromEntries(results.map(r => [
            r.plot,
            {
                wallTime: r.wallTime,
                measures: Object.fromEntries(r.measures.map(m => [m.name, m.duration])),
            },
        ])),
    };
    await writeFile(historyPath, JSON.stringify(historyEntry) + '\n', { flag: 'a' });

    console.log(`\nReport: ${reportPath}`);
    console.log(`History: ${historyPath}`);

    // --- Summary ---
    console.log(`\n${'='.repeat(55)}`);
    if(failures.length) {
        console.log(`FAILED: ${failures.length} check(s) failed`);
        for(const f of failures) {
            console.log(`  - ${f.error}`);
        }
    } else {
        console.log('PASSED: all checks passed');
    }

    await browser.close();
    server.kill();

    process.exit(failures.length ? 1 : 0);
}

runBench().catch((err) => {
    console.error('Bench failed:', err);
    process.exit(2);
});
