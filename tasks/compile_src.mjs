#!/usr/bin/env node
/**
 * Compile src/*.ts → src/*.js for the dist branch.
 *
 * The dist branch ships lib/*.js files that reference src/...index.js,
 * but source is TypeScript. This script emits JS alongside the TS files
 * so ESM imports through lib/ work on the dist branch.
 *
 * Run as part of `pnpm run build` or standalone before npm-dist.
 */
import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tmpDir = join(root, 'tmp', 'compiled-src');

// Clean
if(existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });

// Compile TS → JS into temp dir
console.log('Compiling src/*.ts → src/*.js for dist...');
try {
    execSync('npx tsc -p tsconfig.emit.json', { cwd: root, stdio: 'pipe' });
} catch(e) {
    // TS5055 errors from stackgl_modules are expected (allowJs + outDir conflict)
    // The TS files still compile successfully
    const stderr = e.stderr?.toString() || '';
    const lines = stderr.split('\n').filter((l) => l.includes('error') && !l.includes('TS5055'));
    if(lines.length) {
        console.error('tsc errors:');
        lines.forEach((l) => console.error('  ' + l));
        process.exit(1);
    }
}

// Copy compiled JS back into src/ (alongside existing .ts files)
cpSync(tmpDir, join(root, 'src'), { recursive: true });

// Clean up
rmSync(tmpDir, { recursive: true });

console.log('Done — src/*.js files emitted for dist consumption.');
