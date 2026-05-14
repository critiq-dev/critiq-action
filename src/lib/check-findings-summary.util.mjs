/**
 * Human-readable summary of `critiq check --format json` envelope for CI logs.
 * @typedef {{ rule?: { id?: string }; title?: string; summary?: string; severity?: string; locations?: { primary?: { path?: string; startLine?: number } } }} CatalogFinding
 * @typedef {{ detectorId?: string; summary?: string; locations?: { primary?: { path?: string; startLine?: number } } }} SecretFinding
 * @typedef {{ message?: string; code?: string; severity?: string }} LooseDiagnostic
 */

const SEVERITY_ORDER = /** @type {const} */ ({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
});

const BAR = '─'.repeat(62);

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {{ path?: string; startLine?: number } | undefined} loc
 */
function formatLocation(loc) {
  if (!loc?.path) return '';
  if (typeof loc.startLine === 'number') return `${loc.path}:${loc.startLine}`;
  return loc.path;
}

/**
 * @param {CatalogFinding} f
 */
function catalogFindingRank(f) {
  const s = f.severity;
  return typeof s === 'string' && s in SEVERITY_ORDER ? SEVERITY_ORDER[/** @type {keyof typeof SEVERITY_ORDER} */ (s)] : 99;
}

/**
 * @param {CatalogFinding} f
 * @param {number} n
 */
function formatCatalogFinding(f, n) {
  const ruleId = f.rule?.id ?? 'unknown-rule';
  const sev = f.severity ?? '?';
  const title = (f.title ?? '').trim() || '(no title)';
  const summary = (f.summary ?? '').trim();
  const loc = formatLocation(f.locations?.primary);
  const lines = [`  ${n}. [${sev}] ${ruleId}`, `     ${title}`];
  if (summary && summary !== title) {
    lines.push(`     ${truncate(summary, 360)}`);
  }
  if (loc) lines.push(`     at ${loc}`);
  return lines.join('\n');
}

/**
 * @param {SecretFinding} f
 * @param {number} n
 */
function formatSecretFinding(f, n) {
  const id = f.detectorId ?? 'unknown-detector';
  const summary = truncate((f.summary ?? '').trim() || '(no summary)', 360);
  const loc = formatLocation(f.locations?.primary);
  const lines = [`  ${n}. [secrets] ${id}`, `     ${summary}`];
  if (loc) lines.push(`     at ${loc}`);
  return lines.join('\n');
}

/**
 * @param {LooseDiagnostic} d
 */
function formatDiagnostic(d) {
  const code = d.code ? `${d.code}: ` : '';
  const sev = d.severity ? `[${d.severity}] ` : '';
  const msg = (d.message ?? '').trim() || JSON.stringify(d);
  return `${sev}${code}${msg}`;
}

/**
 * @param {(msg: string) => void} log
 * @param {unknown} envelope
 */
export function logCheckFindingsSummary(log, envelope) {
  if (!envelope || typeof envelope !== 'object') return;

  const e = /** @type {Record<string, unknown>} */ (envelope);
  const mainRaw = e.findings;
  const main = Array.isArray(mainRaw) ? /** @type {CatalogFinding[]} */ (mainRaw) : [];

  const secretsPayload = e.secretsScan;
  const secretsRaw =
    secretsPayload && typeof secretsPayload === 'object'
      ? /** @type {Record<string, unknown>} */ (secretsPayload).findings
      : undefined;
  const secrets = Array.isArray(secretsRaw) ? /** @type {SecretFinding[]} */ (secretsRaw) : [];

  const diagsRaw = e.diagnostics;
  const diags = Array.isArray(diagsRaw) ? /** @type {LooseDiagnostic[]} */ (diagsRaw) : [];

  const declaredCount = Number(e.findingCount);
  const hasDeclared = Number.isFinite(declaredCount);

  const sortedMain = [...main].sort(
    (a, b) => catalogFindingRank(a) - catalogFindingRank(b) || (a.rule?.id ?? '').localeCompare(b.rule?.id ?? ''),
  );

  const blocks = [];

  if (sortedMain.length > 0) {
    const head = `Catalog findings (${sortedMain.length})`;
    const body = sortedMain.map((f, i) => formatCatalogFinding(f, i + 1)).join('\n\n');
    blocks.push(`${BAR}\n${head}\n${BAR}\n\n${body}`);
  }

  if (secrets.length > 0) {
    const head = `Secret scan findings (${secrets.length})`;
    const body = secrets.map((f, i) => formatSecretFinding(f, i + 1)).join('\n\n');
    blocks.push(`${BAR}\n${head}\n${BAR}\n\n${body}`);
  }

  if (blocks.length === 0 && hasDeclared && declaredCount > 0) {
    blocks.push(
      `${BAR}\nFindings reported (${declaredCount}) but detail lists were empty.\n${BAR}\nSee JSON artifact for the full report.`,
    );
  }

  if (blocks.length > 0) {
    log(blocks.join('\n\n'));
    log('');
  }

  if (diags.length > 0) {
    const lines = diags.slice(0, 12).map((d) => `  • ${formatDiagnostic(d)}`);
    const more = diags.length > 12 ? `\n  … and ${diags.length - 12} more` : '';
    log(`${BAR}\nDiagnostics (${diags.length})\n${BAR}\n${lines.join('\n')}${more}`);
  }
}
