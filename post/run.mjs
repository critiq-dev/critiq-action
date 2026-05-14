#!/usr/bin/env node
/**
 * PR comment posting: honors comment-mode and event; delegates to lib/post-review-comments.mjs.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const postScript = path.join(repoRoot, 'lib/post-review-comments.mjs');

const mode = (process.env.INPUT_COMMENT_MODE ?? 'inline').trim();
const jsonPath = (process.env.INPUT_JSON_PATH ?? '').trim();
const ghOut = process.env.GITHUB_OUTPUT;
const eventPath = process.env.GITHUB_EVENT_PATH;

function log(msg) {
  console.log(`[Critiq post] ${msg}`);
}

function setOutputs(created, skipped) {
  if (!ghOut) return;
  const esc = (v) =>
    String(v)
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A');
  appendFileSync(ghOut, `review-comments-created=${esc(created)}\n`, 'utf8');
  appendFileSync(ghOut, `review-comments-skipped=${esc(skipped)}\n`, 'utf8');
}

function readEvent() {
  if (!eventPath || !existsSync(eventPath)) return {};
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    return {};
  }
}

log(`comment-mode=${mode}, json-path=${jsonPath || '(empty)'}`);

if (mode !== 'inline' && mode !== 'inline+summary') {
  log('Comment mode is off or unsupported — skipping API calls.');
  setOutputs(0, 0);
  process.exit(0);
}

const eventName = process.env.GITHUB_EVENT_NAME ?? '';
if (eventName !== 'pull_request') {
  log(`Event is ${eventName} — inline PR comments only apply to pull_request.`);
  setOutputs(0, 0);
  process.exit(0);
}

const ev = readEvent();
const pr = ev.pull_request;
if (!pr) {
  log('No pull_request payload — skipping.');
  setOutputs(0, 0);
  process.exit(0);
}

const env = {
  ...process.env,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? '',
  CRITIQ_JSON_PATH: jsonPath,
  COMMENT_MODE: mode,
  GITHUB_EVENT_NAME: eventName,
  PR_NUMBER: String(pr.number ?? ''),
  PR_HEAD_SHA: pr.head?.sha ?? '',
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY ?? '',
  GITHUB_API_URL: process.env.GITHUB_API_URL ?? 'https://api.github.com',
};

log('Posting review comments via GitHub API…');
const r = spawnSync(process.execPath, [postScript], {
  env,
  stdio: 'inherit',
  cwd: repoRoot,
});

if (r.error) {
  log(String(r.error));
  setOutputs(0, 0);
  process.exit(0);
}

if (r.status !== 0 && r.status !== null) {
  log(`post-review-comments exited ${r.status} (script may have written outputs already).`);
}

log('Post step finished.');
process.exit(0);
