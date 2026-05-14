#!/usr/bin/env node
/**
 * Posts deduplicated pull request review comments from critiq check JSON.
 * See action README for dedupe rules (line occupancy + resolved thread fingerprints).
 */

import { readFileSync } from 'node:fs';
import { createGithubFetch } from './github-api.util.mjs';
import { extractFpFromBody, formatFindingBody } from './fingerprint.util.mjs';
import { lineKey, normalizePath } from './path.util.mjs';
import { setGithubOutput } from './github-output.util.mjs';

const SUMMARY_MARKER = '<!-- critiq-summary:v1 -->';

/**
 * @param {ReturnType<typeof createGithubFetch>} githubFetch
 */
async function graphqlAllThreads(githubFetch, owner, name, prNumber) {
  const query = `
    query($owner: String!, $name: String!, $n: Int!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $n) {
          reviewThreads(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              isResolved
              comments(first: 50) {
                nodes {
                  databaseId
                  body
                  path
                  line
                  originalLine
                  commit { oid }
                }
              }
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  const threads = [];
  for (;;) {
    const res = await githubFetch('/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query,
        variables: { owner, name: name, n: prNumber, cursor },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GraphQL HTTP ${res.status}: ${t.slice(0, 500)}`);
    }
    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join('; '));
    }
    const conn = json.data.repository.pullRequest.reviewThreads;
    threads.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) {
      break;
    }
    cursor = conn.pageInfo.endCursor;
  }
  return threads;
}

/**
 * @param {ReturnType<typeof createGithubFetch>} githubFetch
 */
async function listAllPullReviewComments(githubFetch, owner, repo, prNumber) {
  const out = [];
  let page = 1;
  for (;;) {
    const path = `/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100&page=${page}`;
    const res = await githubFetch(path);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`List review comments ${res.status}: ${t.slice(0, 500)}`);
    }
    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) {
      break;
    }
    out.push(...chunk);
    if (chunk.length < 100) {
      break;
    }
    page += 1;
  }
  return out;
}

function fingerprintSetsFromThreads(threads) {
  const resolvedFp = new Set();
  const activeFp = new Set();
  for (const thread of threads) {
    const resolved = Boolean(thread.isResolved);
    for (const c of thread.comments?.nodes || []) {
      const fp = extractFpFromBody(c.body);
      if (!fp) {
        continue;
      }
      if (resolved) {
        resolvedFp.add(fp);
      } else {
        activeFp.add(fp);
      }
    }
  }
  return { resolvedFp, activeFp };
}

/** Any existing review comment on path+line at head (Critiq or human). */
function occupiedLinesFromRest(restComments, headSha) {
  const occupiedLineAtHead = new Set();
  for (const c of restComments) {
    if (c.commit_id === headSha && c.path && c.line != null) {
      occupiedLineAtHead.add(lineKey(c.path, c.line));
    }
  }
  return occupiedLineAtHead;
}

function findingLocation(finding) {
  const loc = finding.locations?.primary;
  if (!loc?.path || loc.startLine == null) {
    return null;
  }
  return { path: normalizePath(loc.path), line: Number(loc.startLine) };
}

/**
 * @param {ReturnType<typeof createGithubFetch>} githubFetch
 */
async function createReview(githubFetch, owner, repo, prNumber, headSha, comments) {
  if (comments.length === 0) {
    return;
  }
  const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      commit_id: headSha,
      event: 'COMMENT',
      comments,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Create review ${res.status}: ${t.slice(0, 800)}`);
  }
}

/**
 * @param {ReturnType<typeof createGithubFetch>} githubFetch
 */
async function upsertSummaryIssueComment(githubFetch, owner, repo, issueNumber, body) {
  const listPath = `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`;
  const res = await githubFetch(listPath);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`List issue comments ${res.status}: ${t.slice(0, 500)}`);
  }
  const existing = await res.json();
  const found = existing.find((c) => typeof c.body === 'string' && c.body.includes(SUMMARY_MARKER));

  const fullBody = `${SUMMARY_MARKER}\n\n${body}`;

  if (found) {
    const patch = await githubFetch(`/repos/${owner}/${repo}/issues/comments/${found.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: fullBody }),
    });
    if (!patch.ok) {
      const t = await patch.text();
      throw new Error(`Patch summary comment ${patch.status}: ${t.slice(0, 500)}`);
    }
  } else {
    const post = await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: fullBody }),
    });
    if (!post.ok) {
      const t = await post.text();
      throw new Error(`Post summary comment ${post.status}: ${t.slice(0, 500)}`);
    }
  }
}

function renderSummary(envelope) {
  const fc = envelope.findingCount ?? 0;
  const exitCode = envelope.exitCode ?? 0;
  const diag = envelope.diagnostics?.length ?? 0;
  const secrets = envelope.secretsScan;
  const sfc = secrets?.findingCount ?? 0;
  const lines = [
    '## Critiq scan summary',
    '',
    `- **Findings:** ${fc}`,
    `- **Exit code:** ${exitCode}`,
    `- **Diagnostics:** ${diag}`,
    `- **Advisory secrets findings:** ${sfc}`,
    '',
    'Inline review comments were updated for individual findings where applicable.',
  ];
  return lines.join('\n');
}

/**
 * Uses process.env: GITHUB_TOKEN, CRITIQ_JSON_PATH, COMMENT_MODE, PR_NUMBER, PR_HEAD_SHA,
 * GITHUB_REPOSITORY, GITHUB_API_URL, GITHUB_OUTPUT.
 * @returns {Promise<{ created: number; skipped: number }>}
 */
export async function runPostReviewComments() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const JSON_PATH = process.env.CRITIQ_JSON_PATH;
  const COMMENT_MODE = process.env.COMMENT_MODE || 'inline';
  const PR_NUMBER = parseInt(process.env.PR_NUMBER || '', 10);
  const PR_HEAD_SHA = process.env.PR_HEAD_SHA;
  const REPO = process.env.GITHUB_REPOSITORY;

  let created = 0;
  let skipped = 0;

  const githubFetch = createGithubFetch({
    token: GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  });

  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set');
  }
  if (!JSON_PATH) {
    throw new Error('CRITIQ_JSON_PATH is not set');
  }
  if (!REPO || !PR_HEAD_SHA || !Number.isFinite(PR_NUMBER)) {
    throw new Error('Missing PR_NUMBER, PR_HEAD_SHA, or GITHUB_REPOSITORY');
  }

  const [owner, repo] = REPO.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${REPO}`);
  }

  let envelope;
  try {
    envelope = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  } catch {
    console.log('No valid JSON at CRITIQ_JSON_PATH; skipping comments.');
    setGithubOutput('review-comments-created', '0');
    setGithubOutput('review-comments-skipped', '0');
    return { created: 0, skipped: 0 };
  }

  const findings = Array.isArray(envelope.findings) ? envelope.findings : [];

  const threads = await graphqlAllThreads(githubFetch, owner, repo, PR_NUMBER);
  const restComments = await listAllPullReviewComments(githubFetch, owner, repo, PR_NUMBER);
  const { resolvedFp, activeFp } = fingerprintSetsFromThreads(threads);
  const occupiedLineAtHead = occupiedLinesFromRest(restComments, PR_HEAD_SHA);

  const toCreate = [];

  for (const finding of findings) {
    const fp = finding.fingerprints?.primary;
    const loc = findingLocation(finding);
    if (!fp || !loc) {
      skipped += 1;
      continue;
    }

    if (resolvedFp.has(fp)) {
      skipped += 1;
      continue;
    }
    if (activeFp.has(fp)) {
      skipped += 1;
      continue;
    }
    if (occupiedLineAtHead.has(lineKey(loc.path, loc.line))) {
      skipped += 1;
      continue;
    }

    const body = formatFindingBody(finding);
    if (!body) {
      skipped += 1;
      continue;
    }

    toCreate.push({
      path: loc.path,
      line: loc.line,
      side: 'RIGHT',
      body,
    });

    activeFp.add(fp);
    occupiedLineAtHead.add(lineKey(loc.path, loc.line));
  }

  const chunkSize = 60;
  for (let i = 0; i < toCreate.length; i += chunkSize) {
    const chunk = toCreate.slice(i, i + chunkSize);
    await createReview(githubFetch, owner, repo, PR_NUMBER, PR_HEAD_SHA, chunk);
    created += chunk.length;
  }

  if (COMMENT_MODE === 'inline+summary') {
    await upsertSummaryIssueComment(githubFetch, owner, repo, PR_NUMBER, renderSummary(envelope));
  }

  setGithubOutput('review-comments-created', String(created));
  setGithubOutput('review-comments-skipped', String(skipped));
  return { created, skipped };
}
