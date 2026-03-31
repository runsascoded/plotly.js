#!/usr/bin/env node
/**
 * Generate TypeScript interfaces from plot-schema.json.
 *
 * Reads the plotly schema and emits typed interfaces for traces and layout.
 * valType mapping:
 *   string, color, colorscale, subplotid → string
 *   number, integer, angle → number
 *   boolean → boolean
 *   enumerated → union of values
 *   flaglist → string
 *   data_array, info_array → any[]
 *   any → any
 *   nested objects → recursive interface
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const schema = JSON.parse(readFileSync(join(root, 'dist/plot-schema.json'), 'utf-8'));

function valTypeToTS(attr) {
    if(!attr || !attr.valType) {
        if(attr && typeof attr === 'object' && !Array.isArray(attr)) {
            return null; // nested object, handle recursively
        }
        return 'any';
    }
    switch(attr.valType) {
        case 'string': return 'string';
        case 'color': return 'string';
        case 'colorscale': return 'string | [number, string][]';
        case 'subplotid': return 'string';
        case 'number': return 'number';
        case 'integer': return 'number';
        case 'angle': return 'number';
        case 'boolean': return 'boolean';
        case 'flaglist': return 'string';
        case 'data_array': return 'any[]';
        case 'info_array': return 'any[]';
        case 'any': return 'any';
        case 'enumerated':
            if(attr.values) {
                return attr.values.map(v => {
                    if(typeof v === 'string') return `'${v}'`;
                    if(typeof v === 'boolean') return String(v);
                    return String(v);
                }).join(' | ');
            }
            return 'any';
        default: return 'any';
    }
}

function generateInterface(name, attrs, indent = '') {
    const lines = [];
    const skip = new Set(['editType', 'description', 'role', '_isSubplotObj',
        '_isLinkedToArray', '_arrayAttrRegexps', '_deprecated', 'impliedEdits',
        'uid', '_noTemplating', 'uirevision']);

    for(const [key, attr] of Object.entries(attrs)) {
        if(skip.has(key)) continue;
        if(key.startsWith('_')) continue;
        if(key.endsWith('src')) continue; // data source refs

        const tsType = valTypeToTS(attr);
        if(tsType === null) {
            // nested object
            const nestedAttrs = Object.fromEntries(
                Object.entries(attr).filter(([k]) => !skip.has(k) && !k.startsWith('_'))
            );
            if(Object.keys(nestedAttrs).length > 0) {
                lines.push(`${indent}    ${safeName(key)}?: {`);
                const inner = generateInterface(key, nestedAttrs, indent + '    ');
                lines.push(...inner);
                lines.push(`${indent}    };`);
            }
        } else {
            lines.push(`${indent}    ${safeName(key)}?: ${tsType};`);
        }
    }
    return lines;
}

function safeName(key) {
    if(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return key;
    return `'${key}'`;
}

// Generate trace interfaces
const output = [];
output.push('/**');
output.push(' * Auto-generated from plot-schema.json');
output.push(' * DO NOT EDIT — regenerate with: node tasks/gen-schema-types.mjs');
output.push(' */');
output.push('');

for(const [traceName, traceSchema] of Object.entries(schema.traces)) {
    const attrs = traceSchema.attributes || {};
    const iface = `${traceName.charAt(0).toUpperCase() + traceName.slice(1)}Trace`;
    output.push(`export interface ${iface} {`);
    output.push(`    type: '${traceName}';`);
    output.push(...generateInterface(iface, attrs));
    output.push('}');
    output.push('');
}

// Generate layout interface
output.push('export interface SchemaLayout {');
const layoutAttrs = schema.layout.layoutAttributes || {};
output.push(...generateInterface('SchemaLayout', layoutAttrs));
output.push('}');
output.push('');

// Union type for all traces
const traceNames = Object.keys(schema.traces);
output.push('export type AnyTrace = ' + traceNames.map(t =>
    `${t.charAt(0).toUpperCase() + t.slice(1)}Trace`
).join(' | ') + ';');
output.push('');

const outPath = join(root, 'types/schema.d.ts');
writeFileSync(outPath, output.join('\n') + '\n');
console.log(`Generated ${outPath}`);
console.log(`  ${traceNames.length} trace interfaces`);
console.log(`  ${output.length} lines`);
