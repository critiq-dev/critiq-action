const FP_MARKER_PREFIX = '<!-- critiq-fp:';
const FP_MARKER_SUFFIX = ' -->';

export function extractFpFromBody(body) {
  const re = /<!--\s*critiq-fp:([^>]+?)\s*-->/i;
  const m = typeof body === 'string' ? body.match(re) : null;
  return m ? m[1].trim() : null;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string | null}
 */
export function formatFindingBody(finding) {
  const ruleId = finding.rule?.id || 'unknown-rule';
  const title = finding.title || ruleId;
  const summary = finding.summary || '';
  const fp = finding.fingerprints?.primary;
  if (!fp) {
    return null;
  }
  const marker = `${FP_MARKER_PREFIX}${fp}${FP_MARKER_SUFFIX}`;
  const lines = [`### ${title}`, '', summary, '', `Rule: \`${ruleId}\``, '', marker];
  return lines.join('\n');
}
