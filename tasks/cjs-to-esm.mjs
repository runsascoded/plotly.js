#!/usr/bin/env node
/**
 * AST-based CJS → ESM conversion for plotly.js source files.
 *
 * Usage:
 *   node tasks/cjs-to-esm.mjs [--dry-run] [--verbose] [file-or-glob...]
 *
 * Uses jscodeshift for correct AST-level transforms:
 *   - require() → import (top-level and inline)
 *   - module.exports → export default
 *   - exports.foo = → export named
 *   - exports.foo references → direct foo references
 *   - 'use strict' removal
 *   - .js extension on relative imports
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { extname } from 'path';
import jscodeshift from 'jscodeshift';

const j = jscodeshift;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const patterns = args.filter(a => !a.startsWith('--'));

const files = patterns.length
    ? patterns.flatMap(p => globSync(p))
    : globSync('{src,lib}/**/*.js');

console.log(`Processing ${files.length} files${dryRun ? ' (dry run)' : ''}...`);

let converted = 0;
let skipped = 0;
let errors = [];

for (const file of files) {
    try {
        const original = readFileSync(file, 'utf-8');
        const result = transform(original, file);
        if (result !== original) {
            if (!dryRun) writeFileSync(file, result);
            converted++;
            if (verbose) console.log(`  converted: ${file}`);
        } else {
            skipped++;
        }
    } catch (err) {
        errors.push({ file, error: err.message });
        if (verbose) console.error(`  ERROR: ${file}: ${err.message}`);
    }
}

console.log(`\nDone: ${converted} converted, ${skipped} unchanged, ${errors.length} errors`);
if (errors.length && verbose) {
    for (const { file, error } of errors) {
        console.error(`  ${file}: ${error}`);
    }
}
if (errors.length) process.exit(1);

function fixPath(mod) {
    if (!mod.startsWith('.') && !mod.startsWith('/')) return mod;
    if (!extname(mod)) return mod + '.js';
    return mod;
}

function transform(source, filePath) {
    const root = j(source);
    const importStatements = [];
    let reqCounter = 0;

    // Track which export names we create, so we can fix self-references
    const exportedNames = new Set();

    // ── 1. Remove 'use strict' ──────────────────────────────────
    root.find(j.ExpressionStatement, {
        expression: { type: 'Literal', value: 'use strict' }
    }).remove();
    // Also handle: "use strict"
    root.find(j.ExpressionStatement, {
        expression: { type: 'StringLiteral', value: 'use strict' }
    }).remove();

    // ── 2. Convert top-level `var X = require('...')` ───────────
    root.find(j.VariableDeclaration).forEach(path => {
        // Only top-level
        if (path.parent.node.type !== 'Program') return;
        const decl = path.node.declarations[0];
        if (!decl || !decl.init) return;

        // var X = require('...')
        if (
            decl.init.type === 'CallExpression' &&
            decl.init.callee.type === 'Identifier' &&
            decl.init.callee.name === 'require' &&
            decl.init.arguments.length === 1 &&
            (decl.init.arguments[0].type === 'Literal' || decl.init.arguments[0].type === 'StringLiteral')
        ) {
            const mod = fixPath(decl.init.arguments[0].value);
            if (decl.id.type === 'Identifier') {
                importStatements.push(
                    j.importDeclaration(
                        [j.importDefaultSpecifier(j.identifier(decl.id.name))],
                        j.literal(mod)
                    )
                );
            } else if (decl.id.type === 'ObjectPattern') {
                // Check if all properties are simple (no rest, no nested destructuring)
                const isSimple = decl.id.properties.every(prop =>
                    prop.type !== 'RestElement' &&
                    prop.type !== 'RestProperty' &&
                    prop.value && prop.value.type === 'Identifier'
                );
                if (isSimple) {
                    const specifiers = decl.id.properties.map(prop => {
                        const imported = prop.key.name || prop.key.value;
                        const local = prop.value.name;
                        return j.importSpecifier(j.identifier(imported), j.identifier(local));
                    });
                    importStatements.push(j.importDeclaration(specifiers, j.literal(mod)));
                } else {
                    // Complex destructuring: import default, keep destructure as separate statement
                    const importName = `_req${reqCounter++}`;
                    importStatements.push(
                        j.importDeclaration(
                            [j.importDefaultSpecifier(j.identifier(importName))],
                            j.literal(mod)
                        )
                    );
                    // Replace require() with the import name, keep the destructuring
                    decl.init = j.identifier(importName);
                    return; // don't prune, keep the var statement
                }
            }
            path.prune();
            return;
        }

        // var X = require('...').prop
        if (
            decl.init.type === 'MemberExpression' &&
            decl.init.object.type === 'CallExpression' &&
            decl.init.object.callee.type === 'Identifier' &&
            decl.init.object.callee.name === 'require' &&
            decl.init.object.arguments.length === 1 &&
            (decl.init.object.arguments[0].type === 'Literal' || decl.init.object.arguments[0].type === 'StringLiteral') &&
            decl.id.type === 'Identifier'
        ) {
            const mod = fixPath(decl.init.object.arguments[0].value);
            const prop = decl.init.property.name || decl.init.property.value;
            const local = decl.id.name;
            const specifier = local === prop
                ? j.importSpecifier(j.identifier(prop))
                : j.importSpecifier(j.identifier(prop), j.identifier(local));
            importStatements.push(j.importDeclaration([specifier], j.literal(mod)));
            path.prune();
            return;
        }

        // var lib = (module.exports = {});
        if (
            decl.init.type === 'AssignmentExpression' &&
            decl.init.left.type === 'MemberExpression' &&
            decl.init.left.object.type === 'Identifier' &&
            decl.init.left.object.name === 'module' &&
            decl.init.left.property.name === 'exports'
        ) {
            // Replace with just: var lib = {};
            decl.init = j.objectExpression([]);
            return;
        }
    });

    // ── 3. Convert remaining inline require() calls ─────────────
    root.find(j.CallExpression, {
        callee: { type: 'Identifier', name: 'require' }
    }).forEach(path => {
        if (!path.node.arguments.length) return;
        const arg = path.node.arguments[0];
        if (arg.type !== 'Literal' && arg.type !== 'StringLiteral') return;
        const mod = fixPath(arg.value);

        // Check if it's require('...').prop
        const parent = path.parent.node;
        if (parent.type === 'MemberExpression' && parent.object === path.node) {
            const prop = parent.property.name || parent.property.value;
            const importName = `_req${reqCounter++}`;
            importStatements.push(
                j.importDeclaration(
                    [j.importSpecifier(j.identifier(prop), j.identifier(importName))],
                    j.literal(mod)
                )
            );
            // Replace the whole member expression with the import name
            j(path.parent).replaceWith(j.identifier(importName));
        } else {
            const importName = `_req${reqCounter++}`;
            importStatements.push(
                j.importDeclaration(
                    [j.importDefaultSpecifier(j.identifier(importName))],
                    j.literal(mod)
                )
            );
            j(path).replaceWith(j.identifier(importName));
        }
    });

    // ── 4. Convert module.exports = ... ─────────────────────────

    // module.exports = function(...) { ... }
    root.find(j.ExpressionStatement, {
        expression: {
            type: 'AssignmentExpression',
            left: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: 'module' },
                property: { name: 'exports' }
            }
        }
    }).forEach(path => {
        const right = path.node.expression.right;

        if (right.type === 'FunctionExpression') {
            // export default function name(...) { ... }
            const funcDecl = j.functionDeclaration(
                right.id || null,
                right.params,
                right.body
            );
            funcDecl.generator = right.generator;
            funcDecl.async = right.async;
            path.replace(j.exportDefaultDeclaration(funcDecl));
        } else if (right.type === 'ObjectExpression') {
            path.replace(j.exportDefaultDeclaration(right));
        } else if (right.type === 'Identifier') {
            path.replace(j.exportDefaultDeclaration(right));
        } else {
            // Fallback: export default <expr>
            path.replace(j.exportDefaultDeclaration(right));
        }
    });

    // ── 5. Convert exports.foo = ... ────────────────────────────
    root.find(j.ExpressionStatement, {
        expression: {
            type: 'AssignmentExpression',
            left: {
                type: 'MemberExpression',
                object: { type: 'Identifier', name: 'exports' }
            }
        }
    }).forEach(path => {
        const name = path.node.expression.left.property.name || path.node.expression.left.property.value;
        const right = path.node.expression.right;
        exportedNames.add(name);

        // export var foo = <right>;
        const varDecl = j.variableDeclaration('var', [
            j.variableDeclarator(j.identifier(name), right)
        ]);
        path.replace(j.exportNamedDeclaration(varDecl));
    });

    // Also handle: var X = exports.X = ... (assign-and-export pattern)
    root.find(j.VariableDeclaration).forEach(path => {
        const decl = path.node.declarations[0];
        if (!decl || !decl.init) return;
        if (
            decl.init.type === 'AssignmentExpression' &&
            decl.init.left.type === 'MemberExpression' &&
            decl.init.left.object.type === 'Identifier' &&
            decl.init.left.object.name === 'exports'
        ) {
            const name = decl.id.name;
            exportedNames.add(name);
            decl.init = decl.init.right; // unwrap the exports.X = part
            path.replace(j.exportNamedDeclaration(path.node));
        }
    });

    // ── 6. Fix exports.foo references (not assignments) ─────────
    // Replace `exports.foo` used as expressions with just `foo`
    root.find(j.MemberExpression, {
        object: { type: 'Identifier', name: 'exports' }
    }).forEach(path => {
        // Skip if this is the left side of an assignment (already handled)
        const parent = path.parent.node;
        if (parent.type === 'AssignmentExpression' && parent.left === path.node) return;

        const prop = path.node.property.name || path.node.property.value;
        j(path).replaceWith(j.identifier(prop));
    });

    // ── 7. Build final output ───────────────────────────────────
    // Insert imports at the top of the program
    const program = root.find(j.Program).get();
    const body = program.node.body;

    // Remove leading empty statements (from pruned requires)
    while (body.length && body[0].type === 'EmptyStatement') {
        body.shift();
    }

    // Insert imports at position 0
    for (let i = importStatements.length - 1; i >= 0; i--) {
        body.unshift(importStatements[i]);
    }

    let result = root.toSource({ quote: 'single' });

    // Clean up excessive blank lines
    result = result.replace(/\n{3,}/g, '\n\n');

    // Ensure single trailing newline
    result = result.trimEnd() + '\n';

    return result;
}
