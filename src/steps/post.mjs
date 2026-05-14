#!/usr/bin/env node
/**
 * PR comment posting: honors comment-mode and event; delegates to ../lib/post-review-comments.mjs.
 */

import { readGithubEvent } from '../lib/event.util.mjs';
import { writeGithubOutputPairs } from '../lib/github-output.util.mjs';
import { createLogger } from '../lib/log.util.mjs';
import { runPostReviewComments } from '../lib/post-review-comments.mjs';

const log = createLogger('Critiq post');

const mode = (process.env.INPUT_COMMENT_MODE ?? 'inline').trim();
const jsonPath = (process.env.INPUT_JSON_PATH ?? '').trim();

function setOutputs(created, skipped) {
  writeGithubOutputPairs([
    ['review-comments-created', created],
    ['review-comments-skipped', skipped],
  ]);
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

const ev = readGithubEvent();
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

Object.assign(process.env, env);

let created = 0;
let skipped = 0;
try {
  log('Posting review comments via GitHub API…');
  const r = await runPostReviewComments();
  created = r.created;
  skipped = r.skipped;
} catch (e) {
  log(String(e));
  setOutputs(created, skipped);
}

log('Post step finished.');
process.exit(0);
