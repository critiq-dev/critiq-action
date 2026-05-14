/**
 * Banner for CI logs.
 *
 * Block-art matches `apps/cli/src/rendering/check.rendering.ts` (`scanBanner`);
 * glyphs are `\u` escapes so this file stays ASCII-only on disk.
 *
 * GitHub’s log UI often lacks Block Elements in its monospace font (shows U+FFFD).
 * On Actions we default to an ASCII frame unless `CRITIQ_ACTION_LOGO=blocks`.
 */

const CRITIQ_SITE = 'https://critiq.dev';
const TAGLINE = 'Increase the confidence in the code you ship';

const BLOCK_BANNER_LINES = [
  '                                                               ',
  '  \u2584\u2588\u2588\u2588\u2588\u2588 \u2584\u2584\u2584\u2584  \u2584\u2584 \u2584\u2584\u2584\u2584\u2584\u2584 \u2584\u2584  \u2584\u2584\u2584    \u2584\u2588\u2588\u2588\u2588\u2588  \u2584\u2584\u2584\u2584  \u2584\u2584\u2584  \u2584\u2584  \u2584\u2584  ',
  '  \u2588\u2588     \u2588\u2588\u2584\u2588\u2584 \u2588\u2588   \u2588\u2588   \u2588\u2588 \u2588\u2588\u2580\u2588\u2588   \u2580\u2580\u2580\u2584\u2584\u2584 \u2588\u2588\u2580\u2580\u2580 \u2588\u2588\u2580\u2588\u2588 \u2588\u2588\u2588\u2584\u2588\u2588  ',
  '  \u2580\u2588\u2588\u2588\u2588\u2588 \u2588\u2588 \u2588\u2588 \u2588\u2588   \u2588\u2588   \u2588\u2588 \u2580\u2588\u2588\u2588\u2580   \u2588\u2588\u2588\u2588\u2588\u2580 \u2580\u2588\u2588\u2588\u2588 \u2588\u2588\u2580\u2588\u2588 \u2588\u2588 \u2580\u2588\u2588  ',
  '                               \u2580\u2580                              ',
];

const ASCII_BANNER_LINES = [
  '==============================================================',
  '                         CRITIQ                               ',
  '==============================================================',
];

function useBlockBanner() {
  if (process.env.CRITIQ_ACTION_LOGO === 'blocks') return true;
  if (process.env.CRITIQ_ACTION_LOGO === 'ascii') return false;
  return process.env.GITHUB_ACTIONS !== 'true';
}

export function printCritiqBanner() {
  const lines = useBlockBanner() ? BLOCK_BANNER_LINES : ASCII_BANNER_LINES;
  const body = `${lines.join('\n')}\n${CRITIQ_SITE}\n\n${TAGLINE}\n`;
  process.stdout.write(Buffer.from(body, 'utf8'));
}
