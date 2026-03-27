#!/usr/bin/env node
/**
 * Fix d3.event references by adding `event` parameter to .on() callbacks.
 *
 * Handles the common pattern:
 *   .on('click', function(d) { ... d3.event ... })
 *   → .on('click', function(event, d) { ... event ... })
 *
 * Also handles:
 *   .on('click', function() { ... d3.event ... })
 *   → .on('click', function(event) { ... event ... })
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.js');
let totalFixed = 0;

for (const file of files) {
    let code = readFileSync(file, 'utf-8');
    if (!code.includes('d3.event')) continue;

    let fixCount = 0;

    // Pattern 1: .on('eventname', function() { ... d3.event ... })
    // Add event as first param
    code = code.replace(
        /\.on\((['"][^'"]+['"]),\s*function\(\)/g,
        (match, eventName) => {
            fixCount++;
            return `.on(${eventName}, function(event)`;
        }
    );

    // Pattern 2: .on('eventname', function(d) { ... d3.event ... })
    // Add event before d
    code = code.replace(
        /\.on\((['"][^'"]+['"]),\s*function\((\w+)\)/g,
        (match, eventName, param) => {
            // Only add event if d3.event is used nearby (within this callback)
            // We can't do perfect scope analysis, but this is a good heuristic
            fixCount++;
            return `.on(${eventName}, function(event, ${param})`;
        }
    );

    // Pattern 3: .on('eventname', function(d, i) { ... })
    // Add event before d, i
    code = code.replace(
        /\.on\((['"][^'"]+['"]),\s*function\((\w+),\s*(\w+)\)/g,
        (match, eventName, p1, p2) => {
            fixCount++;
            return `.on(${eventName}, function(event, ${p1})`;
            // Note: d3 v7 .on() callbacks get (event, datum) — no index param
            // The old (datum, index) becomes (event, datum)
        }
    );

    // Now replace all d3.event with event
    code = code.replace(/\bd3\.event\b/g, 'event');

    // Remove TODO comments about d3.event
    code = code.replace(/\/\/ TODO: d3\.event removed.*\n/g, '');

    if (fixCount > 0) {
        writeFileSync(file, code);
        totalFixed += fixCount;
        console.log(`  ${file}: ${fixCount} callbacks fixed`);
    }
}

console.log(`\nTotal: ${totalFixed} callbacks fixed`);

// Check for remaining d3.event
const remaining = globSync('src/**/*.js').filter(f => {
    const c = readFileSync(f, 'utf-8');
    return /\bd3\.event\b/.test(c) && !/\/\/.*d3\.event/.test(c);
});
if (remaining.length) {
    console.log(`\nRemaining d3.event in ${remaining.length} files:`);
    remaining.forEach(f => console.log(`  ${f}`));
}
