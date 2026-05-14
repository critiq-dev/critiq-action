#!/usr/bin/env node
/**
 * Exits 1 when any finding meets or exceeds FAIL_ON_SEVERITY (off = never).
 */

import { readFileSync } from 'node:fs';

const ALLOWED = new Set(['off', 'low', 'medium', 'high', 'critical']);
const RANK = { low: 1, medium: 2, high: 3, critical: 4 };

const raw = (process.env.FAIL_ON_SEVERITY ?? 'off').trim();
const threshold = raw === '' ? 'off' : raw.toLowerCase();
const jsonPath = process.env.CRITIQ_JSON_PATH;

if (!ALLOWED.has(threshold)) {
  console.error(
    `Invalid fail-on-severity "${raw}". Use: off, low, medium, high, critical.`,
  );
  process.exit(1);
}

if (threshold === 'off') {
  process.exit(0);
}

if (!jsonPath) {
  console.error('CRITIQ_JSON_PATH is not set.');
  process.exit(1);
}

let data;
try {
  const raw = readFileSync(jsonPath, 'utf8');
  data = JSON.parse(raw);
} catch (e) {
  console.error('Could not read Critiq JSON; failing because fail-on-severity is not off.', e);
  process.exit(1);
}

const minRank = RANK[threshold];
const findings = Array.isArray(data.findings) ? data.findings : [];

for (const f of findings) {
  const sev = String(f.severity ?? '').toLowerCase();
  const r = RANK[sev];
  if (r != null && r >= minRank) {
    console.error(
      `Failing job: finding at or above "${threshold}" (rule ${f.rule?.id ?? 'unknown'}, severity ${f.severity}).`,
    );
    process.exit(1);
  }
}

process.exit(0);
