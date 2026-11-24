#!/usr/bin/env node
/**
 * Typecheck the whole project but only REPORT errors inside the given path(s).
 * Lets many builders work in parallel without being blocked by each other's WIP.
 *   npm run check:mod -- src/minigames/tonometry
 */
import { spawnSync } from 'node:child_process';
const paths = process.argv.slice(2).map((p) => p.replace(/\/$/, ''));
if (!paths.length) {
  console.error('usage: npm run check:mod -- <path> [<path>...]');
  process.exit(2);
}
const r = spawnSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json', '--pretty', 'false'], { encoding: 'utf8' });
const lines = (r.stdout + r.stderr).split('\n');
const mine = [];
let keep = false;
for (const line of lines) {
  const isHeader = /^\S.*\(\d+,\d+\): error/.test(line);
  if (isHeader) keep = paths.some((p) => line.startsWith(p));
  if (keep && line.trim()) mine.push(line);
}
if (mine.length) {
  console.error(mine.join('\n'));
  console.error(`\n✖ ${mine.filter((l) => / error /.test(l)).length} type error(s) in ${paths.join(', ')}`);
  process.exit(1);
}
console.log(`✔ no type errors in ${paths.join(', ')}`);
