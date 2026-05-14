export function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/');
}

export function lineKey(path, line) {
  return `${normalizePath(path)}:${Number(line)}`;
}
