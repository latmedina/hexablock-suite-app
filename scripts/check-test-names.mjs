#!/usr/bin/env node
/**
 * Fails when a test title does not follow the course convention
 * `should_<expected_result>_when_<condition>` (snake_case, lowercase).
 * `describe` blocks are free text; only `it(...)` and `test(...)` titles are checked.
 * Usage: node scripts/check-test-names.mjs [dir ...]   (default: test)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PATTERN = /^should_[a-z0-9]+(?:_[a-z0-9]+)*_when_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const TITLE = /\b(?:it|test)(?:\.(?:only|skip|each\([^)]*\)))?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
const TEST_FILE = /\.(?:test|spec|int-spec|e2e-spec|pact)\.[cm]?[jt]sx?$/;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (TEST_FILE.test(name)) out.push(path);
  }
  return out;
}

const roots = process.argv.slice(2);
const files = (roots.length ? roots : ['test']).flatMap((root) => walk(root, []));
const bad = [];
let checked = 0;

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(TITLE)) {
      checked += 1;
      if (!PATTERN.test(match[2])) bad.push(`${file}:${index + 1}  "${match[2]}"`);
    }
  });
}

if (bad.length) {
  console.error(`Test names must match should_<expected>_when_<condition>:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log(`Test names OK (${checked} tests in ${files.length} files).`);
