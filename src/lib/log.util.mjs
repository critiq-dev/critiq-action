/**
 * @param {string} prefix
 * @returns {(msg: string) => void}
 */
export function createLogger(prefix) {
  return (msg) => {
    console.log(`[${prefix}] ${msg}`);
  };
}
