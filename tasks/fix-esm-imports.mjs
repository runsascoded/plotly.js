#!/usr/bin/env node
/**
 * Fix named imports from modules that only have default exports.
 * Converts: import { X } from './foo' → import _foo from './foo'; const { X } = _foo;
 * Runs iteratively until no more errors.
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const entryPoint = process.argv[2] || 'lib/index.js';

async function run() {
    const { build } = await import('esbuild');

    for (let iter = 0; iter < 10; iter++) {
        let result;
        try {
            result = await build({
                entryPoints: [entryPoint],
                bundle: true, format: 'iife', globalName: 'Plotly', write: false,
                platform: 'browser', loader: { '.css': 'empty', '.json': 'json' },
                define: { 'process.env.NODE_ENV': '"production"', global: 'window' },
                logLevel: 'silent',
            });
            console.log(`Iteration ${iter + 1}: No errors!`);
            console.log(`Size: ${(result.outputFiles[0].contents.length / 1024).toFixed(0)} KB`);
            return;
        } catch(e) {
            const errors = (e.errors || []).filter(err =>
                err.text.includes('No matching export') && !err.text.includes('node_modules')
            );

            if (!errors.length) {
                // Other errors
                console.log(`Iteration ${iter + 1}: ${(e.errors || []).length} non-import errors remaining`);
                (e.errors || []).forEach(err => console.log(`  ${err.text.slice(0, 100)} @ ${err.location?.file}:${err.location?.line}`));
                return;
            }

            // Group by importing file + line
            const fixes = new Map();
            for (const err of errors) {
                if (!err.location) continue;
                const m = err.text.match(/No matching export in "([^"]+)" for import "([^"]+)"/);
                if (!m) continue;
                const [, sourceFile, importName] = m;
                if (sourceFile.includes('node_modules') || importName === 'default') continue;
                const key = `${err.location.file}:${err.location.line}`;
                if (!fixes.has(key)) fixes.set(key, { file: err.location.file, line: err.location.line, sourceFile, names: [] });
                fixes.get(key).names.push(importName);
            }

            let totalFixed = 0;
            for (const [key, info] of fixes) {
                let code = readFileSync(info.file, 'utf-8');
                const lines = code.split('\n');
                const lineIdx = info.line - 1;
                const line = lines[lineIdx];
                if (!line) continue;

                const importMatch = line.match(/^import \{([^}]+)\} from ('.*');?$/);
                if (!importMatch) continue;

                const allNames = importMatch[1].split(',').map(s => s.trim());
                const fromPath = importMatch[2];
                const defaultName = '_' + info.sourceFile.replace(/.*\//, '').replace(/\.js$/, '').replace(/[^a-zA-Z0-9]/g, '_');

                const destructureParts = allNames.map(n => {
                    const asMatch = n.match(/(\w+) as (\w+)/);
                    return asMatch ? asMatch[1] + ': ' + asMatch[2] : n;
                });

                lines[lineIdx] = `import ${defaultName} from ${fromPath};\nconst { ${destructureParts.join(', ')} } = ${defaultName};`;
                writeFileSync(info.file, lines.join('\n'));
                totalFixed++;
            }

            // Merge duplicate imports
            const allFiles = globSync('{src,lib}/**/*.js');
            for (const file of allFiles) {
                let code = readFileSync(file, 'utf-8');
                const lines = code.split('\n');
                const seen = new Map();
                const toRemove = new Set();
                const mergeDestructures = new Map();

                for (let i = 0; i < lines.length; i++) {
                    const m = lines[i].match(/^import (\w+) from ('.*');?$/);
                    if (m) {
                        const [, name, path] = m;
                        if (seen.has(name)) {
                            toRemove.add(i);
                            // Merge next line's destructure into first occurrence
                            if (i + 1 < lines.length && lines[i + 1].startsWith('const {') && lines[i + 1].includes(`= ${name};`)) {
                                if (!mergeDestructures.has(name)) mergeDestructures.set(name, []);
                                mergeDestructures.get(name).push(lines[i + 1]);
                                toRemove.add(i + 1);
                            }
                        } else {
                            seen.set(name, i);
                            if (i + 1 < lines.length && lines[i + 1].startsWith('const {') && lines[i + 1].includes(`= ${name};`)) {
                                if (!mergeDestructures.has(name)) mergeDestructures.set(name, []);
                                mergeDestructures.get(name).push(lines[i + 1]);
                            }
                        }
                    }
                }

                if (toRemove.size) {
                    // Merge destructures
                    for (const [name, destLines] of mergeDestructures) {
                        if (destLines.length <= 1) continue;
                        const allNames = new Set();
                        for (const line of destLines) {
                            const m = line.match(/const \{([^}]+)\} = /);
                            if (m) m[1].split(',').map(s => s.trim()).forEach(n => allNames.add(n));
                        }
                        const firstIdx = seen.get(name) + 1;
                        lines[firstIdx] = `const { ${[...allNames].join(', ')} } = ${name};`;
                    }
                    writeFileSync(file, lines.filter((_, i) => !toRemove.has(i)).join('\n'));
                }
            }

            console.log(`Iteration ${iter + 1}: fixed ${totalFixed} imports (${errors.length} errors)`);
        }
    }
}

run().catch(e => { console.error(e); process.exit(1); });
