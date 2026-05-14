#!/usr/bin/env node
/**
 * Exits 1 when any finding meets or exceeds FAIL_ON_SEVERITY (off = never).
 */

import { readFileSync } from 'node:fs';
import {
  findFirstBlockingFinding,
  normalizeFailOnSeverity,
} from '../lib/severity.util.mjs';

const raw = (process.env.FAIL_ON_SEVERITY ?? 'off').trim();
let threshold;
try {
  threshold = normalizeFailOnSeverity(raw);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

if (threshold === 'off') {
  process.exit(0);
}

const jsonPath = process.env.CRITIQ_JSON_PATH;
if (!jsonPath) {
  console.error('CRITIQ_JSON_PATH is not set.');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (e) {
  console.error('Could not read Critiq JSON; failing because fail-on-severity is not off.', e);
  process.exit(1);
}

const findings = Array.isArray(data.findings) ? data.findings : [];
const hit = findFirstBlockingFinding(findings, threshold);
if (hit) {
  console.error(
    `Failing job: finding at or above "${threshold}" (rule ${hit.ruleId}, severity ${hit.severity}).`,
  );
  process.exit(1);
}

process.exit(0);
