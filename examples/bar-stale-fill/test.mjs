#!/usr/bin/env node
/**
 * Drive the bar-fill-stale-on-react reproducer.
 *
 * Boots vite on 5274, opens the page, captures View A bar fills, clicks
 * View B, then asserts:
 *   1. gd._fullData reflects View B (2 bars + scatter)
 *   2. gd.calcdata[i][0].trace.marker.color matches View B's expected colors
 *   3. THE RENDERED <path> fill on each bar trace matches the new marker.color
 *      (this is the actual bug — internal state is right, SVG is wrong)
 *
 * Exit 0 if (3) passes for both bar indices. Exit 1 ("Bug REPRODUCED")
 * if any bar fill is still View A's color (or any other stale value).
 */
import { spawn } from 'child_process';
import { chromium } from 'playwright';

const PORT = 5274;
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
    const staleLogs = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push('console: ' + msg.text());
        const text = msg.text();
        if (text.includes('[STALE-BAR]')) staleLogs.push(text);
    });

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('.main-svg', { timeout: 30000 });
    await page.waitForTimeout(1000);

    const dump = () => page.evaluate(() => {
        const gd = window.__pltDiv;
        if (!gd) return { error: 'no __pltDiv' };
        const barLayer = gd.querySelector('g.barlayer');
        const traceGs = barLayer ? [...barLayer.querySelectorAll('g.trace.bars')] : [];
        const barTraces = traceGs.map((g, i) => {
            const paths = [...g.querySelectorAll('g.points > g.point > path')];
            const fills = paths.map(p => p.style.fill || p.getAttribute('fill') || '');
            return { idx: i, pathCount: paths.length, fills };
        });
        return {
            fullDataLen: gd._fullData?.length,
            fullDataNames: gd._fullData?.map(t => t.name),
            fullDataColors: gd._fullData?.map(t => t.marker?.color),
            calcdataColors: (gd.calcdata || []).map(cd => cd?.[0]?.trace?.marker?.color),
            barTraces,
        };
    });

    const a = await dump();
    console.log('\n=== View A ===');
    console.log(JSON.stringify(a, null, 2));

    const logCountBeforeClick = staleLogs.length;
    await page.click('button[data-view="B"]');
    await page.waitForTimeout(1500);

    const b = await dump();
    console.log('\n=== View B (after click) ===');
    console.log(JSON.stringify(b, null, 2));

    // Helpers
    const rgbOf = (hex) => {
        const m = hex.replace('#', '').match(/.{2}/g) || [];
        const [r, g, bl] = m.map(s => parseInt(s, 16));
        return `rgb(${r}, ${g}, ${bl})`;
    };
    const EXPECT_B1 = rgbOf('#EF553B'); // red
    const EXPECT_B2 = rgbOf('#00cc96'); // green
    const STALE_A1 = rgbOf('#19d3f3'); // cyan
    const STALE_A2 = rgbOf('#FFA15A'); // orange

    // _fullData and calcdata should reflect View B (per spec these are healthy).
    const fullDataOK = JSON.stringify(b.fullDataColors) === JSON.stringify(['#EF553B', '#00cc96', undefined]);

    // The actual bug: the rendered fill for each bar trace must equal the new
    // marker.color. b.barTraces is a list per bar trace; each entry has fills[].
    const allBarFills = (b.barTraces || []).map(t => t.fills?.[0] || '');
    const firstBarOK = allBarFills[0] === EXPECT_B1;
    const secondBarOK = allBarFills[1] === EXPECT_B2;
    const noStaleA = !allBarFills.some(f => f === STALE_A1 || f === STALE_A2);

    console.log('\n=== Verdict ===');
    console.log('_fullData has new marker.colors            :', fullDataOK ? 'PASS' : 'FAIL');
    console.log('bar trace 0 fill ===', EXPECT_B1, '       :', firstBarOK ? 'PASS' : `FAIL (got ${JSON.stringify(allBarFills[0])})`);
    console.log('bar trace 1 fill ===', EXPECT_B2, '       :', secondBarOK ? 'PASS' : `FAIL (got ${JSON.stringify(allBarFills[1])})`);
    console.log('no stale View A colors in any bar trace    :', noStaleA ? 'PASS' : 'FAIL');

    if (staleLogs.length > logCountBeforeClick) {
        console.log('\n=== STALE-BAR LOGS (post-click) ===');
        staleLogs.slice(logCountBeforeClick).forEach((line, i) =>
            console.log(`[${String(i).padStart(3, ' ')}] ${line}`));
    }

    if (errors.length) {
        console.log('\n=== Page errors ===');
        errors.forEach(e => console.log('  ' + e));
    }

    if (!fullDataOK || !firstBarOK || !secondBarOK || !noStaleA) {
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
