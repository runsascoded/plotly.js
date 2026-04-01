import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

import constants from './util/constants.cjs';

const caseInsensitive = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
const { isArray } = Array;
const isObject = (v) => typeof v === 'object' && v !== null && !isArray(v);
const isArrayOfObjects = (v) => isArray(v) && isObject(v[0]);
const typeHandle = (v) => (isArrayOfObjects(v) ? sortArrayOfObjects(v) : isObject(v) ? sortObject(v) : v);

function sortArrayOfObjects(list) {
    return list.map(item => typeHandle(item));
}

function sortObject(obj) {
    const sorted = {};
    for (const key of Object.keys(obj).sort(caseInsensitive)) {
        sorted[key] = typeHandle(obj[key]);
    }
    return sorted;
}

// Build plotly as a self-contained IIFE for jsdom evaluation
// This is the same approach as the old schema task but uses ESM source
const result = await build({
    entryPoints: ['src/core.ts'],
    bundle: true,
    format: 'iife',
    globalName: 'Plotly',
    write: false,
    platform: 'browser',
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"', global: 'window' },
    logLevel: 'warning',
});

const bundleCode = new TextDecoder().decode(result.outputFiles[0].contents);

// Run in jsdom
const dom = new JSDOM('', { runScripts: 'dangerously' });
dom.window.URL.createObjectURL = function() {};

const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = bundleCode;
dom.window.document.body.appendChild(scriptEl);

const Plotly = dom.window.Plotly?.default || dom.window.Plotly;

if (!Plotly || !Plotly.PlotSchema) {
    console.error('Failed to load Plotly. Keys:', Object.keys(dom.window.Plotly || {}));
    process.exit(1);
}

const obj = Plotly.PlotSchema.get();
const sortedObj = sortObject(obj);
const plotSchemaStr = JSON.stringify(sortedObj, null, 2);

const isDist = process.argv.indexOf('dist') !== -1;
const pathToSchema = isDist ? constants.pathToSchemaDist : constants.pathToSchemaDiff;

fs.writeFileSync(pathToSchema, plotSchemaStr);
console.log('ok ' + path.basename(pathToSchema));
