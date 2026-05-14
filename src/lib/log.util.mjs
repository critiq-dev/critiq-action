/**
 * Plain stdout logger for CI (no step prefix).
 * @returns {(msg: string) => void}
 */
export function createLogger() {
  return (msg) => {
    for (const line of String(msg).split('\n')) {
      console.log(line);
    }
  };
}
