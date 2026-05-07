#!/usr/bin/env node
/**
 * Drive the React Plotly.react stale-redraw repro.
 *
 * Boots `vite` on port 5273, opens the page in headless Chromium, captures
 * View A state, clicks "View B", and asserts that:
 *   1. `gd._fullData.length === 4` (new trace count)
 *   2. `[...gd.querySelectorAll('.legendtext')]` matches `_fullData` names
 *   3. y-axis ticks reflect the new (much larger) data scale
 *
 * Exit 0 if all asserts pass (bug NOT reproduced — the fork's react path
 * works correctly for this scenario). Exit 1 if any assert fails (bug
 * reproduced — captures and prints diagnostic state).
 */
import { spawn } from 'child_process';
import { chromium } from 'playwright';

const PORT = 5273;
const URL = `http://localhost:${PORT}/`;

console.log('Starting vite dev server...');
const vite = spawn('pnpm', ['exec', 'vite'], {
    cwd: import.meta.dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
});

let viteReady = false;
const viteOut = [];
vite.stdout.on('data', (d) => {
    const s = d.toString();
    viteOut.push(s);
    if (/ready in/i.test(s) || /Local:/i.test(s)) viteReady = true;
});
vite.stderr.on('data', (d) => viteOut.push(d.toString()));

const start = Date.now();
while (!viteReady && Date.now() - start < 30000) {
    await new Promise(r => setTimeout(r, 200));
}
if (!viteReady) {
    console.error('Vite failed to start within 30s. Output:');
    console.error(viteOut.join(''));
    vite.kill();
    process.exit(2);
}

console.log(`Vite ready on ${URL}`);
let exitCode = 0;
const browser = await chromium.launch({ headless: true });
try {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push('console: ' + msg.text());
    });

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('.main-svg', { timeout: 30000 });
    await page.waitForTimeout(1000);

    const dump = (label) => page.evaluate(() => {
        const gd = window.__pltDiv;
        if (!gd) return { error: 'no __pltDiv' };
        return {
            fullDataLen: gd._fullData?.length,
            fullDataNames: gd._fullData?.map(t => t.name),
            legendTexts: [...gd.querySelectorAll('.legendtext')].map(e => e.textContent),
            yaxisRange: gd._fullLayout?.yaxis?.range?.slice(),
            yaxisAutorange: gd._fullLayout?.yaxis?.autorange,
            uirevision: gd._fullLayout?.uirevision,
            yaxisUirevision: gd._fullLayout?.yaxis?.uirevision,
            ytickTexts: [...gd.querySelectorAll('.ytick text')].slice(0, 12).map(e => e.textContent),
            transition: gd._fullLayout?.transition === undefined ? '<undefined>' : gd._fullLayout.transition,
        };
    });

    const a = await dump('A');
    console.log('\n=== View A ===');
    console.log(JSON.stringify(a, null, 2));

    await page.click('button[data-view="B"]');
    await page.waitForTimeout(1500);

    const b = await dump('B');
    console.log('\n=== View B (after click) ===');
    console.log(JSON.stringify(b, null, 2));

    // Legend orders items by traceorder; default for stacked-bar mix is
    // reversed. So compare legend SVG to _fullData names as a SET (any
    // permutation OK — the bug we care about is "legend has WRONG names",
    // not "legend has correct names in surprising order").
    const expectedSet = new Set(['Classic', 'Electric', 'Classic (12mo)', 'Electric (12mo)']);
    const legendSet = new Set(b.legendTexts);
    const setEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
    const fullDataOK = setEq(new Set(b.fullDataNames), expectedSet);
    const legendOK = setEq(legendSet, expectedSet);
    // View B explicitly sets range [0, 1.01] and tickformat '.0%'.
    const rangeOK = JSON.stringify(b.yaxisRange) === JSON.stringify([0, 1.01]);
    // ytick texts in View B should be percent-formatted (e.g. "0%", "20%", ...).
    const tickPercentOK = b.ytickTexts && b.ytickTexts.some(t => /%$/.test(t));

    console.log('\n=== Verdict ===');
    console.log('_fullData reflects View B          :', fullDataOK ? 'PASS' : 'FAIL');
    console.log('legend SVG reflects View B (set)   :', legendOK ? 'PASS' : 'FAIL');
    console.log('yaxis.range == [0, 1.01]           :', rangeOK ? 'PASS' : 'FAIL');
    console.log('ytick texts use percent format     :', tickPercentOK ? 'PASS' : 'FAIL');

    if (errors.length) {
        console.log('\n=== Page errors ===');
        errors.forEach(e => console.log('  ' + e));
    }

    if (!fullDataOK || !legendOK || !rangeOK || !tickPercentOK) {
        console.log('\n*** Bug REPRODUCED ***');
        exitCode = 1;
    } else {
        console.log('\n*** Bug NOT reproduced (this scenario is healthy) ***');
    }
} finally {
    await browser.close();
    vite.kill();
}
process.exit(exitCode);
