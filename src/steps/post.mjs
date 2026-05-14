#!/usr/bin/env node
/**
 * PR comment posting: honors comment-mode and event; delegates to ../lib/post-review-comments.mjs.
 */

import {
  printActionRunSummary,
  readFindingCountFromCritiqJson,
} from '../lib/action-run-summary.util.mjs';
import { readGithubEvent } from '../lib/event.util.mjs';
import { writeGithubOutputPairs } from '../lib/github-output.util.mjs';
import { runPostReviewComments } from '../lib/post-review-comments.mjs';

const mode = (process.env.INPUT_COMMENT_MODE ?? 'inline').trim();
const jsonPath = (process.env.INPUT_JSON_PATH ?? '').trim();
const eventName = process.env.GITHUB_EVENT_NAME ?? '';

function setOutputs(created, skipped) {
  writeGithubOutputPairs([
    ['review-comments-created', created],
    ['review-comments-skipped', skipped],
  ]);
}

const findingCount = readFindingCountFromCritiqJson(jsonPath);

if (mode !== 'inline' && mode !== 'inline+summary') {
  setOutputs(0, 0);
  printActionRunSummary({
    eventName,
    findingCount,
    commentsCreated: 0,
    commentsSkipped: 0,
    state: 'comment-mode-disabled',
  });
  process.exit(0);
}

if (eventName !== 'pull_request') {
  setOutputs(0, 0);
  printActionRunSummary({
    eventName,
    findingCount,
    commentsCreated: 0,
    commentsSkipped: 0,
    state: 'not-pull-request',
  });
  process.exit(0);
}

const ev = readGithubEvent();
const pr = ev.pull_request;
if (!pr) {
  setOutputs(0, 0);
  printActionRunSummary({
    eventName,
    findingCount,
    commentsCreated: 0,
    commentsSkipped: 0,
    state: 'missing-payload',
  });
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
  const r = await runPostReviewComments();
  created = r.created;
  skipped = r.skipped;
} catch (e) {
  console.error(String(e));
  setOutputs(created, skipped);
  printActionRunSummary({
    eventName,
    findingCount,
    commentsCreated: created,
    commentsSkipped: skipped,
    state: 'post-error',
  });
  process.exit(0);
}

printActionRunSummary({
  eventName,
  findingCount,
  commentsCreated: created,
  commentsSkipped: skipped,
  state: 'posted',
});
process.exit(0);
