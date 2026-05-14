#!/usr/bin/env node
/**
 * Runs `critiq check` with PR diff scope on pull_request when base/head inputs are empty;
 * otherwise supports --staged, explicit --base/--head, or a full scan (no diff args).
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resolveCritiqBin } from '../lib/critiq-bin.util.mjs';
import { readPrShasFromEvent } from '../lib/event.util.mjs';
import { writeGithubOutputPairs } from '../lib/github-output.util.mjs';
import { createLogger } from '../lib/log.util.mjs';
import { resolveActionWorkspace } from '../lib/workspace.util.mjs';

const log = createLogger('Critiq scan');
const cwd = resolveActionWorkspace(process.env.INPUT_WORKING_DIRECTORY);
const target = (process.env.INPUT_TARGET ?? '.').trim() || '.';
const staged = (process.env.INPUT_STAGED ?? 'false').toLowerCase() === 'true';
const baseRef = (process.env.INPUT_BASE_REF ?? '').trim();
const headRef = (process.env.INPUT_HEAD_REF ?? '').trim();
const eventName = process.env.GITHUB_EVENT_NAME ?? '';
const runId = process.env.GITHUB_RUN_ID ?? '0';
const attempt = process.env.GITHUB_RUN_ATTEMPT ?? '0';
const runnerTemp = process.env.RUNNER_TEMP ?? '/tmp';
const jsonPath = path.join(runnerTemp, `critiq-check-${runId}-${attempt}.json`);
const stderrPath = path.join(runnerTemp, `critiq-check-${runId}-${attempt}.stderr`);

function extraArgs() {
  if (staged) {
    log('Using --staged (diff against index).');
    return ['--staged'];
  }
  if (baseRef && headRef) {
    log(`Using explicit --base / --head (${baseRef.slice(0, 7)}… / ${headRef.slice(0, 7)}…).`);
    return ['--base', baseRef, '--head', headRef];
  }
  if (baseRef || headRef) {
    console.error('[Critiq scan] Set both base-ref and head-ref, or leave both empty.');
    process.exit(1);
  }
  if (eventName === 'pull_request') {
    const { base, head } = readPrShasFromEvent();
    if (base && head) {
      log('pull_request event — scanning PR diff (default base/head from event).');
      return ['--base', base, '--head', head];
    }
    log('pull_request event but could not read base/head from event payload — full scan.');
    return [];
  }
  log(`${eventName} event — full scan (no --base/--head).`);
  return [];
}

const extra = extraArgs();
const bin = resolveCritiqBin(cwd);
log(`binary: ${bin}`);
log(`target: ${target}`);
log(`json output: ${jsonPath}`);

const args = ['check', target, '--format', 'json', ...extra];
log(`running: ${bin} ${args.join(' ')}`);

const r = spawnSync(bin, args, {
  cwd,
  env: { ...process.env },
  maxBuffer: 256 * 1024 * 1024,
});

if (r.error) {
  console.error('[Critiq scan]', r.error);
  writeGithubOutputPairs([
    ['exit-code', 1],
    ['finding-count', 0],
    ['json-path', jsonPath],
  ]);
  process.exit(0);
}

const stderrBuf = r.stderr;
const stderr =
  typeof stderrBuf === 'string'
    ? stderrBuf
    : Buffer.isBuffer(stderrBuf)
      ? stderrBuf.toString('utf8')
      : '';

const stdoutBuf = r.stdout;
const stdout =
  typeof stdoutBuf === 'string'
    ? stdoutBuf
    : Buffer.isBuffer(stdoutBuf)
      ? stdoutBuf.toString('utf8')
      : String(stdoutBuf ?? '');

const code = r.status ?? 1;

if (stderr) {
  appendFileSync(stderrPath, stderr, 'utf8');
}

if (!stdout.trim()) {
  console.error(`[Critiq scan] No JSON on stdout (exit ${code}). Stderr log: ${stderrPath}`);
  if (stderr) console.error(stderr);
  writeGithubOutputPairs([
    ['exit-code', code],
    ['finding-count', 0],
    ['json-path', jsonPath],
  ]);
  process.exit(0);
}

writeFileSync(jsonPath, stdout, 'utf8');

let findingCount = 0;
try {
  const j = JSON.parse(stdout);
  findingCount = Number(j.findingCount ?? 0);
} catch {
  findingCount = 0;
}

log(`critiq exit=${code}, findingCount=${findingCount}`);
writeGithubOutputPairs([
  ['exit-code', code],
  ['finding-count', findingCount],
  ['json-path', jsonPath],
]);
