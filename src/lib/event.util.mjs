import { existsSync, readFileSync } from 'node:fs';

/**
 * @param {string} [eventPath]
 */
export function readGithubEvent(eventPath = process.env.GITHUB_EVENT_PATH) {
  if (!eventPath || !existsSync(eventPath)) return {};
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Base and head SHAs for the PR from the webhook payload.
 * @returns {{ base: string; head: string }}
 */
export function readPrShasFromEvent() {
  const ev = readGithubEvent();
  const pr = ev.pull_request;
  if (!pr) return { base: '', head: '' };
  return { base: pr.base?.sha ?? '', head: pr.head?.sha ?? '' };
}
