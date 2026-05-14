/**
 * ASCII banner aligned with `apps/cli/src/rendering/check.rendering.ts` (`scanBanner`).
 * Printed once at the start of the action install step.
 */
const BANNER_LINES = [
  `                                                               `,
  `  ▄█████ ▄▄▄▄  ▄▄ ▄▄▄▄▄▄ ▄▄  ▄▄▄    ▄█████  ▄▄▄▄  ▄▄▄  ▄▄  ▄▄  `,
  `  ██     ██▄█▄ ██   ██   ██ ██▀██   ▀▀▀▄▄▄ ██▀▀▀ ██▀██ ███▄██  `,
  `  ▀█████ ██ ██ ██   ██   ██ ▀███▀   █████▀ ▀████ ██▀██ ██ ▀██  `,
  `                               ▀▀                              `,
];

const CRITIQ_SITE = 'https://critiq.dev';

export function printCritiqBanner() {
  console.log(BANNER_LINES.join('\n'));
  console.log(CRITIQ_SITE);
  console.log('');
  console.log('Increase the confidence in the code you ship');
}
