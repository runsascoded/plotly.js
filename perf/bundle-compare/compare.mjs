#!/usr/bin/env node
/**
 * Bundle size comparison: fork vs upstream plotly.js
 *
 * Builds a minimal app (scatter + bar) against:
 *   1. Upstream plotly.js-basic-dist-min (pre-built, no tree-shaking)
 *   2. Fork entry points (ESM, esbuild bundles from source)
 *
 * Reports exact byte counts for CI assertion.
 *
 * Usage:
 *   node perf/bundle-compare/compare.mjs [--update]
 */
import { build } from 'esbuild';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const update = process.argv.includes('--update');
const thresholdsPath = join(__dirname, 'thresholds.json');

// Ensure upstream packages are available (download tarballs + extract)
import { existsSync, mkdirSync } from 'fs';

function ensureUpstream() {
    const upDir = join(__dirname, 'upstream');
    const fullJs = join(upDir, 'plotly.min.js');
    const basicJs = join(upDir, 'plotly-basic.min.js');
    if (existsSync(fullJs) && existsSync(basicJs)) return;

    mkdirSync(upDir, { recursive: true });
    console.log('Downloading upstream plotly.js v3.3.1...');
    for (const [pkg, file] of [
        ['plotly.js-dist-min', 'plotly.min.js'],
        ['plotly.js-basic-dist-min', 'plotly-basic.min.js'],
    ]) {
        execSync(`npm pack ${pkg}@3.3.1 2>/dev/null`, { cwd: upDir });
        const tgz = `${pkg}-3.3.1.tgz`;
        execSync(`tar xzf ${tgz} --strip-components=1 -C . && rm ${tgz}`, { cwd: upDir });
    }
    if (!existsSync(fullJs) || !existsSync(basicJs)) {
        throw new Error('Failed to download upstream plotly.js');
    }
    console.log('  done');
}

async function bundleSize(label, opts) {
    const result = await build({
        bundle: true,
        format: 'iife',
        globalName: 'Plotly',
        write: false,
        minify: true,
        platform: 'browser',
        define: { 'process.env.NODE_ENV': '"production"', 'global': 'window' },
        loader: { '.css': 'empty' },
        external: ['stream'],
        ...opts,
    });
    return result.outputFiles[0].contents.length;
}

// Build the app with different plotly sources
async function measureApp(label, plotlyImport, resolveDir) {
    const appCode = await readFile(join(__dirname, 'app.js'), 'utf-8');
    const code = appCode.replace("from 'plotly.js'", `from '${plotlyImport}'`);
    return bundleSize(label, {
        stdin: { contents: code, resolveDir: resolveDir || root, loader: 'js' },
    });
}

// Build just the plotly entry point (no app code)
async function measureEntry(label, entryPoint) {
    const resolved = entryPoint.startsWith('/') ? entryPoint : join(root, entryPoint);
    return bundleSize(label, {
        entryPoints: [resolved],
    });
}

async function main() {
    ensureUpstream();

    let thresholds;
    try {
        thresholds = JSON.parse(await readFile(thresholdsPath, 'utf-8'));
    } catch {
        thresholds = {};
    }

    const results = {};
    const failures = [];

    console.log('=== Bundle size comparison: fork vs upstream ===\n');
    console.log(`  ${'Configuration'.padEnd(32)} ${'Size'.padStart(12)}  ${'vs upstream basic'.padStart(18)}`);
    console.log('  ' + '-'.repeat(65));

    // Upstream bundles (as entry points, simulating script-tag / pre-built usage)
    const upFull = await measureEntry('upstream-full', join(__dirname, 'upstream/plotly.min.js'));
    const upBasic = await measureEntry('upstream-basic', join(__dirname, 'upstream/plotly-basic.min.js'));

    // Fork bundles
    const forkFull = await bundleSize('fork-full', {
        entryPoints: [join(root, 'lib/index.js')],
        external: ['stream'],
    });
    const forkBasic = await measureEntry('fork-basic', 'lib/index-basic.js');
    const forkMinimal = await measureEntry('fork-minimal', 'lib/index-minimal.js');
    const forkLite = await measureEntry('fork-lite', 'lib/index-lite.js');

    // Factory: tree-shaken scatter+bar+legend only
    const appFactory = await bundleSize('app-factory', {
        entryPoints: [join(__dirname, 'app-factory.js')],
    });

    // App-level comparison (what consumers actually experience)
    const appUpBasic = await measureApp('app-upstream-basic', join(__dirname, 'upstream/plotly-basic.min.js'));
    const appForkLite = await measureApp('app-fork-lite', join(root, 'lib/index-lite.js'));
    const appForkBasic = await measureApp('app-fork-basic', join(root, 'lib/index-basic.js'));

    const allResults = [
        ['upstream full (min)',        upFull,       upBasic],
        ['upstream basic (min)',       upBasic,      upBasic],
        ['fork full (min)',            forkFull,     upBasic],
        ['fork basic (min)',           forkBasic,    upBasic],
        ['fork minimal (min)',         forkMinimal,  upBasic],
        ['fork lite (min)',            forkLite,     upBasic],
        ['fork factory (min)',         appFactory,   upBasic],
        ['', 0, 0],
        ['app + upstream basic',       appUpBasic,   appUpBasic],
        ['app + fork basic',           appForkBasic, appUpBasic],
        ['app + fork lite',            appForkLite,  appUpBasic],
        ['app + fork factory',         appFactory,   appUpBasic],
    ];

    for (const [label, size, baseline] of allResults) {
        if (!label) { console.log(''); continue; }
        const kb = `${(size / 1024).toFixed(0)} KB`;
        const delta = size - baseline;
        const pct = baseline ? ((delta / baseline) * 100).toFixed(1) : '0.0';
        const sign = delta > 0 ? '+' : '';
        const cmp = delta === 0 ? '' : `${sign}${(delta / 1024).toFixed(0)} KB / ${sign}${pct}%`;
        console.log(`  ${label.padEnd(32)} ${kb.padStart(12)}  ${cmp.padStart(18)}`);
        results[label.replace(/[^a-zA-Z0-9_]/g, '_')] = size;
    }

    // Assert against thresholds
    console.log('\n=== Threshold checks ===\n');
    for (const [key, expectedBytes] of Object.entries(thresholds)) {
        const actual = results[key];
        if (actual === undefined) continue;
        if (actual !== expectedBytes) {
            const delta = actual - expectedBytes;
            const sign = delta > 0 ? '+' : '';
            const msg = `${key}: expected ${expectedBytes.toLocaleString()}, got ${actual.toLocaleString()} (${sign}${delta.toLocaleString()})`;
            if (update) {
                thresholds[key] = actual;
                console.log(`  UPDATED: ${msg}`);
            } else {
                console.log(`  FAIL: ${msg}`);
                failures.push(msg);
            }
        } else {
            console.log(`  OK: ${key} = ${actual.toLocaleString()} bytes`);
        }
    }

    if (update) {
        // If no thresholds exist yet, populate from results
        if (Object.keys(thresholds).length === 0) {
            Object.assign(thresholds, results);
            console.log('  Initialized thresholds from current results.');
        }
        await writeFile(thresholdsPath, JSON.stringify(thresholds, null, 4) + '\n');
        console.log(`  → ${thresholdsPath} updated`);
    }

    if (failures.length) {
        console.log(`\nFAILED: ${failures.length} check(s) failed`);
        process.exit(1);
    } else {
        console.log('\nPASSED');
    }
}

main().catch(e => { console.error(e); process.exit(1); });
