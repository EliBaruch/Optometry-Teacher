#!/usr/bin/env node
/**
 * Architecture guard: enforces that the game is a set of swappable plugins,
 * not a monolith. Fails CI if any module imports something it must not.
 *
 * Layers (src/<layer>/...):
 *   core                         -> nothing
 *   render, audio, learning      -> core
 *   ui-kit                       -> core
 *   content                      -> core
 *   modes/<m>                    -> core
 *   minigames/<g>, sins/<s>, scenes/<s>  -> core, ui-kit, render   (and only their OWN folder)
 *   app                          -> anything (composition root)
 * Third-party packages allowed outside app: preact only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const SRC = join(ROOT, 'src');
const ALIASES = { '@core': 'core', '@ui-kit': 'ui-kit', '@render': 'render', '@audio': 'audio', '@learning': 'learning' };
const PLUGIN_LAYERS = new Set(['minigames', 'sins', 'scenes', 'modes']);
const ALLOWED = {
  core: [],
  render: ['core'],
  audio: ['core'],
  learning: ['core'],
  'ui-kit': ['core'],
  content: ['core'],
  modes: ['core'],
  minigames: ['core', 'ui-kit', 'render'],
  sins: ['core', 'ui-kit', 'render'],
  scenes: ['core', 'ui-kit', 'render'],
  app: '*',
};
const ALLOWED_PACKAGES = [/^preact(\/.*)?$/];
const TEST_PACKAGES = [/^vitest(\/.*)?$/];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

/** Returns {layer, unit} for a path inside src, e.g. minigames/tonometry */
function locate(absPath) {
  const rel = relative(SRC, absPath).split(sep);
  const layer = rel[0];
  const unit = PLUGIN_LAYERS.has(layer) && rel.length > 2 ? `${layer}/${rel[1]}` : layer;
  return { layer, unit };
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
const violations = [];
const files = walk(SRC);

for (const file of files) {
  const { layer, unit } = locate(file);
  const rules = ALLOWED[layer];
  if (rules === undefined) {
    violations.push(`${relative(ROOT, file)}: unknown layer "${layer}" (add it to scripts/check-boundaries.mjs)`);
    continue;
  }
  if (rules === '*') continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    let targetAbs = null;
    const alias = Object.keys(ALIASES).find((a) => spec === a || spec.startsWith(a + '/'));
    if (alias) targetAbs = join(SRC, ALIASES[alias], spec.slice(alias.length));
    else if (spec.startsWith('.')) targetAbs = resolve(dirname(file), spec);
    else {
      const isTest = /\.test\.tsx?$/.test(file);
      if (!ALLOWED_PACKAGES.some((re) => re.test(spec)) && !(isTest && TEST_PACKAGES.some((re) => re.test(spec)))) {
        violations.push(`${relative(ROOT, file)}: third-party import "${spec}" not allowed outside src/app`);
      }
      continue;
    }
    if (!targetAbs.startsWith(SRC)) {
      violations.push(`${relative(ROOT, file)}: import "${spec}" escapes src/`);
      continue;
    }
    const target = locate(targetAbs.endsWith(sep) ? targetAbs : targetAbs + '/x');
    if (target.layer === layer) {
      if (PLUGIN_LAYERS.has(layer) && target.unit !== unit) {
        violations.push(`${relative(ROOT, file)}: plugin "${unit}" imports sibling plugin "${target.unit}" ("${spec}")`);
      }
      continue;
    }
    if (!rules.includes(target.layer)) {
      violations.push(`${relative(ROOT, file)}: layer "${layer}" may not import "${target.layer}" ("${spec}")`);
    }
  }
}

if (violations.length) {
  console.error(`\n✖ ${violations.length} module-boundary violation(s):\n`);
  for (const v of violations) console.error('  - ' + v);
  console.error('\nSee docs/ARCHITECTURE.md for the layer rules.\n');
  process.exit(1);
}
console.log(`✔ module boundaries OK (${files.length} files checked)`);
