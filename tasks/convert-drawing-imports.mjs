#!/usr/bin/env node
/**
 * Convert `import Drawing from '...drawing/index.js'` to named imports
 * in all remaining consumer files, then remove the default export
 * from drawing/index.js.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Find all files that still use the default import
const files = execSync('grep -rl "import Drawing from.*drawing/index" src/ --include="*.js"', { encoding: 'utf-8' })
    .trim().split('\n').filter(Boolean);

console.log(`Converting ${files.length} files...`);

let totalConverted = 0;

for(const file of files) {
    let code = readFileSync(file, 'utf-8');

    // Find all Drawing.xxx usages
    const methods = new Set();
    const methodRegex = /Drawing\.(\w+)/g;
    let match;
    while((match = methodRegex.exec(code)) !== null) {
        methods.add(match[1]);
    }

    if(methods.size === 0) {
        console.log(`  ${file}: no Drawing.xxx calls found, skipping`);
        continue;
    }

    // Check for local variable conflicts
    const conflicts = new Set();
    for(const method of methods) {
        // Check for local var/let/const/function declarations with same name
        const declRegex = new RegExp(`\\b(?:var|let|const|function)\\s+${method}\\b`);
        // Also check for parameter names
        const paramRegex = new RegExp(`function[^(]*\\([^)]*\\b${method}\\b`);
        if(declRegex.test(code) || paramRegex.test(code)) {
            conflicts.add(method);
        }
    }

    // Build the import statement
    const namedMethods = [...methods].filter(m => !conflicts.has(m)).sort();
    const conflictMethods = [...conflicts].sort();

    let importParts = [];
    if(conflictMethods.length > 0) {
        importParts.push('Drawing');
    }
    if(namedMethods.length > 0) {
        importParts.push(`{ ${namedMethods.join(', ')} }`);
    }

    // Find the import path
    const importMatch = code.match(/import Drawing from ['"]([^'"]+drawing\/index\.js)['"]/);
    if(!importMatch) {
        console.log(`  ${file}: can't find import statement, skipping`);
        continue;
    }
    const importPath = importMatch[1];

    // Replace import
    const newImport = `import ${importParts.join(', ')} from '${importPath}'`;
    code = code.replace(/import Drawing from ['"][^'"]+drawing\/index\.js['"]/, newImport);

    // Replace Drawing.xxx with xxx for non-conflicting methods
    for(const method of namedMethods) {
        // Replace Drawing.method with method (but not inside strings)
        code = code.replace(new RegExp(`Drawing\\.${method}\\b`, 'g'), method);
    }

    writeFileSync(file, code);
    totalConverted++;
    const conflictStr = conflictMethods.length ? ` (kept Drawing.${conflictMethods.join(', Drawing.')})` : '';
    console.log(`  ${file}: ${namedMethods.length} methods converted${conflictStr}`);
}

console.log(`\nConverted ${totalConverted} files.`);

// Now remove the default export from drawing/index.js
const drawingPath = 'src/components/drawing/index.js';
let drawingCode = readFileSync(drawingPath, 'utf-8');

// Check if any files still use default import
const remaining = execSync('grep -rl "import Drawing from.*drawing/index" src/ --include="*.js" 2>/dev/null || true', { encoding: 'utf-8' }).trim();
if(remaining) {
    console.log(`\nWARNING: ${remaining.split('\n').length} files still use default import:`);
    console.log(remaining);
    console.log('NOT removing default export.');
} else {
    // Remove the default export
    drawingCode = drawingCode.replace(/\nexport default drawing;\n?/, '\n');
    // Also remove the `var drawing = {` aggregation object if it exists
    // (it was already removed in the named export conversion)
    writeFileSync(drawingPath, drawingCode);
    console.log('\nRemoved default export from drawing/index.js');
}
