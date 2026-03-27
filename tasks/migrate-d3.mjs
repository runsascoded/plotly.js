#!/usr/bin/env node
/**
 * Migrate all @plotly/d3 v3 imports to d3 v7 ESM packages.
 * Must be run as all-or-nothing (v3 and v7 can't coexist).
 *
 * This handles the IMPORT replacement and simple API renames.
 * d3.event callback refactoring must still be done manually per-file.
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.js');
let converted = 0;

for (const file of files) {
    let code = readFileSync(file, 'utf-8');
    if (!code.includes("import d3 from '@plotly/d3'")) continue;

    // Analyze which d3 APIs this file uses
    const apis = new Set();
    const matches = code.matchAll(/d3\.(\w+)/g);
    for (const m of matches) apis.add(m[1]);

    // Build the replacement imports
    const imports = new Set();
    const replacements = [];

    // d3.select / d3.selectAll → d3-selection
    if (apis.has('select') || apis.has('selectAll') || apis.has('selection')) {
        const names = [];
        if (apis.has('select')) names.push('select');
        if (apis.has('selectAll')) names.push('selectAll');
        if (apis.has('selection')) names.push('selection');
        imports.add(`import { ${names.join(', ')} } from 'd3-selection';`);
        if (apis.has('select')) replacements.push(['d3.select(', 'select(']);
        if (apis.has('selectAll')) replacements.push(['d3.selectAll(', 'selectAll(']);
        if (apis.has('selection')) replacements.push(['d3.selection', 'selection']);
    }

    // d3.transition → d3-transition (side effect: extends selection)
    if (apis.has('transition')) {
        imports.add("import 'd3-transition';");
    }

    // d3.scale.xxx → d3-scale
    if (apis.has('scale')) {
        imports.add("import { scaleLinear, scaleLog, scaleOrdinal } from 'd3-scale';");
        // d3.scale.linear() → scaleLinear()
        replacements.push(['d3.scale.linear()', 'scaleLinear()']);
        replacements.push(['d3.scale.log()', 'scaleLog()']);
        replacements.push(['d3.scale.ordinal()', 'scaleOrdinal()']);
    }

    // d3.svg.xxx → d3-shape
    if (apis.has('svg')) {
        imports.add("import { line as d3Line, area as d3Area, arc as d3Arc, symbol as d3Symbol } from 'd3-shape';");
        replacements.push(['d3.svg.line(', 'd3Line(']);
        replacements.push(['d3.svg.area(', 'd3Area(']);
        replacements.push(['d3.svg.arc(', 'd3Arc(']);
        replacements.push(['d3.svg.symbol(', 'd3Symbol(']);
    }

    // d3.extent/min/max → d3-array
    if (apis.has('extent') || apis.has('min') || apis.has('max')) {
        const names = [];
        if (apis.has('extent')) names.push('extent');
        if (apis.has('min')) names.push('min');
        if (apis.has('max')) names.push('max');
        imports.add(`import { ${names.join(', ')} } from 'd3-array';`);
        if (apis.has('extent')) replacements.push(['d3.extent(', 'extent(']);
        if (apis.has('min')) replacements.push(['d3.min(', 'min(']);
        if (apis.has('max')) replacements.push(['d3.max(', 'max(']);
    }

    // d3.dispatch → d3-dispatch
    if (apis.has('dispatch')) {
        imports.add("import { dispatch } from 'd3-dispatch';");
        replacements.push(['d3.dispatch(', 'dispatch(']);
    }

    // d3.rgb → d3-color
    if (apis.has('rgb')) {
        imports.add("import { rgb } from 'd3-color';");
        replacements.push(['d3.rgb(', 'rgb(']);
    }

    // d3.json → fetch
    if (apis.has('json')) {
        // d3.json(url, callback) → fetch(url).then(r => r.json()).then(data => callback(null, data))
        // This needs manual conversion per call site
        replacements.push(['d3.json', '/* TODO: d3.json */ d3.json']);
    }

    // d3.geo → d3-geo (v7)
    if (apis.has('geo')) {
        imports.add("import * as d3Geo from 'd3-geo';");
        replacements.push(['d3.geo', 'd3Geo']);
    }

    // d3.round → inline helper
    if (apis.has('round')) {
        // Add inline helper
        imports.add("// d3.round removed in v4; inline replacement");
        replacements.push(['d3.round(', 'd3Round(']);
        // We'll add the function after imports
    }

    // d3.ease → d3-ease
    if (apis.has('ease')) {
        imports.add("import * as d3Ease from 'd3-ease';");
        replacements.push(['d3.ease(', 'd3Ease[']);  // needs manual fix
    }

    // d3.locale → already using d3-format formatLocale
    if (apis.has('locale')) {
        // d3.locale is used in plots.js which already imports formatLocale
        replacements.push(['d3.locale(', '/* TODO: d3.locale */ d3.locale(']);
    }

    // d3.rebind → removed, needs manual replacement
    if (apis.has('rebind')) {
        replacements.push(['d3.rebind(', '/* TODO: d3.rebind */ d3Rebind(']);
    }

    // d3.event → mark for manual conversion (can't be automated)
    if (apis.has('event')) {
        // Add a comment, don't break the code
        // The caller needs to add `event` parameter to callbacks
        imports.add("// TODO: d3.event removed in v4+; refactor event handlers to receive event as callback parameter");
    }

    // d3.mouse → d3-selection pointer
    if (apis.has('mouse')) {
        imports.add("import { pointer } from 'd3-selection';");
        // d3.mouse(container) → pointer(event, container) — needs event param
        replacements.push(['d3.mouse(', '/* TODO: needs event param */ pointer(']);
    }

    // d3.behavior → d3-zoom / d3-drag
    if (apis.has('behavior')) {
        imports.add("import { zoom as d3Zoom } from 'd3-zoom';");
        imports.add("import { drag as d3Drag } from 'd3-drag';");
        replacements.push(['d3.behavior.zoom()', 'd3Zoom()']);
        replacements.push(['d3.behavior.drag()', 'd3Drag()']);
    }

    // Apply replacements
    // Remove the old import
    code = code.replace("import d3 from '@plotly/d3';", [...imports].join('\n'));

    // Apply text replacements
    for (const [from, to] of replacements) {
        code = code.split(from).join(to);
    }

    // Add d3Round helper if needed
    if (apis.has('round')) {
        code = code.replace(
            "// d3.round removed in v4; inline replacement",
            "function d3Round(x, n) { return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x); }"
        );
    }

    writeFileSync(file, code);
    converted++;

    const todos = (code.match(/TODO:/g) || []).length;
    if (todos > 0) {
        console.log(`  ${file}: ${todos} TODOs`);
    }
}

console.log(`\nConverted ${converted} files`);
console.log(`\nRemaining @plotly/d3 imports:`);
const remaining = globSync('src/**/*.js').filter(f => readFileSync(f, 'utf-8').includes("@plotly/d3"));
console.log(`  ${remaining.length} files`);
