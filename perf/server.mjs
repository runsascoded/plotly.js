#!/usr/bin/env node
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const bundle = process.argv.includes('--basic') ? 'index-basic'
    : process.argv.includes('--lite') ? 'index-lite'
    : 'index-minimal';
const port = parseInt(process.env.PORT || '0', 10);

// Build plotly bundle once at startup
console.error(`Building ${bundle}...`);
const result = await build({
    entryPoints: [join(root, 'lib', bundle + '.js')],
    bundle: true,
    format: 'iife',
    globalName: 'Plotly',
    write: false,
    minify: false,
    sourcemap: false,
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"', 'global': 'window' },
    loader: { '.css': 'empty' },
});
const plotlyJs = Buffer.from(result.outputFiles[0].contents);
console.error(`Bundle size: ${(plotlyJs.length / 1024).toFixed(0)} KB`);

// Build plots.js for browser use
const plotsResult = await build({
    entryPoints: [join(__dirname, 'plots.js')],
    bundle: true,
    format: 'iife',
    globalName: '__PLOTLY_PLOTS__',
    write: false,
    platform: 'browser',
});
const plotsJs = Buffer.from(plotsResult.outputFiles[0].contents);

const demoHtml = await readFile(join(__dirname, 'demo.html'));

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
};

const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;

    if(path === '/' || path === '/index.html') {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': demoHtml.length,
        });
        res.end(demoHtml);
    } else if(path === '/plotly.js') {
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Content-Length': plotlyJs.length,
        });
        res.end(plotlyJs);
    } else if(path === '/plots.js') {
        res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Content-Length': plotsJs.length,
        });
        res.end(plotsJs);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(port, () => {
    const addr = server.address();
    // Print port to stdout so bench.mjs can read it
    console.log(addr.port);
    console.error(`Perf server listening on http://localhost:${addr.port}`);
});
