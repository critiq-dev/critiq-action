const ALLOWED = new Set(['off', 'low', 'medium', 'high', 'critical']);
const RANK = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * @param {string} raw
 * @returns {string} normalized threshold
 */
export function normalizeFailOnSeverity(raw) {
  const t = (raw ?? 'off').trim();
  const threshold = t === '' ? 'off' : t.toLowerCase();
  if (!ALLOWED.has(threshold)) {
    throw new Error(
      `Invalid fail-on-severity "${raw}". Use: off, low, medium, high, critical.`,
    );
  }
  return threshold;
}

/**
 * @param {unknown[]} findings
 * @param {string} threshold normalized (not 'off')
 * @returns {{ ruleId: string; severity: string } | null}
 */
export function findFirstBlockingFinding(findings, threshold) {
  const minRank = RANK[/** @type {'low'|'medium'|'high'|'critical'} */ (threshold)];
  for (const f of findings) {
    const obj = /** @type {Record<string, unknown>} */ (f);
    const sev = String(obj.severity ?? '').toLowerCase();
    const r = RANK[/** @type {keyof typeof RANK} */ (sev)];
    if (r != null && r >= minRank) {
      const rule = /** @type {{ id?: string }} | undefined */ (obj.rule);
      return { ruleId: rule?.id ?? 'unknown', severity: String(obj.severity ?? '') };
    }
  }
  return null;
}
