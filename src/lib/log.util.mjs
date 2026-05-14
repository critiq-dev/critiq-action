/**
 * @param {string} prefix
 * @returns {(msg: string) => void}
 */
export function createLogger(prefix) {
  return (msg) => {
    for (const line of String(msg).split('\n')) {
      console.log(`[${prefix}] ${line}`);
    }
  };
}
