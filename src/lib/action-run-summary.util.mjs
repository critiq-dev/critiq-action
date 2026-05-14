import { readFileSync } from 'node:fs';

/**
 * @param {string} jsonPath
 */
export function readFindingCountFromCritiqJson(jsonPath) {
  const p = (jsonPath ?? '').trim();
  if (!p) return 0;
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'));
    const n = Number(data.findingCount ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {{
 *   eventName: string;
 *   findingCount: number;
 *   commentsCreated: number;
 *   commentsSkipped: number;
 *   state: 'posted' | 'comment-mode-disabled' | 'not-pull-request' | 'missing-payload' | 'post-error';
 * }} opts
 */
export function printActionRunSummary(opts) {
  const { eventName, findingCount, commentsCreated, commentsSkipped, state } = opts;
  const issueWord = findingCount === 1 ? 'issue' : 'issues';
  const commentWord = commentsCreated === 1 ? 'comment' : 'comments';
  const isPr = eventName === 'pull_request';

  if (state === 'post-error') {
    console.log(
      `Critiq scanned this pull request and found ${findingCount} ${issueWord}, but posting inline review comments failed — see the error log above.`,
    );
    return;
  }

  if (state === 'comment-mode-disabled') {
    const lead = isPr
      ? 'Critiq successfully scanned this pull request'
      : 'Critiq successfully completed the scan';
    console.log(
      `${lead} and found ${findingCount} ${issueWord}. Inline review comments are disabled for this workflow (comment-mode).`,
    );
    return;
  }

  if (state === 'not-pull-request') {
    console.log(
      `Critiq successfully completed the scan and found ${findingCount} ${issueWord}. Inline review comments are only posted on pull_request events.`,
    );
    return;
  }

  if (state === 'missing-payload') {
    console.log(
      `Critiq finished the scan (${findingCount} ${issueWord}) but could not read pull request metadata from the event; no inline comments were posted.`,
    );
    return;
  }

  let msg = `Critiq successfully scanned this pull request, found ${findingCount} ${issueWord}, and posted ${commentsCreated} new inline ${commentWord}.`;
  if (commentsSkipped > 0) {
    const skipWord = commentsSkipped === 1 ? 'issue was' : 'issues were';
    msg += ` ${commentsSkipped} ${skipWord} already on the pull request from an earlier review (duplicate finding, resolved thread, or line already carrying a comment).`;
  } else {
    msg += ' No findings were skipped as already posted or resolved.';
  }
  console.log(msg);
}
