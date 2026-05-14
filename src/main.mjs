#!/usr/bin/env node
/**
 * Dispatches to ./steps/<name>.mjs (loaded for side effects / top-level await).
 * Usage: node src/main.mjs <install|scan|post|fail-on-severity>
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ALLOWED = new Set(['install', 'scan', 'post', 'fail-on-severity']);

const step = (process.argv[2] ?? '').trim();
if (!ALLOWED.has(step)) {
  console.error(
    `Usage: node src/main.mjs <${[...ALLOWED].sort().join('|')}>`,
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, 'steps', `${step}.mjs`);
await import(pathToFileURL(target).href);
