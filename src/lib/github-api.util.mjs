/**
 * @param {{ token?: string; apiUrl?: string }} opts
 * @returns {(path: string, init?: RequestInit) => Promise<Response>}
 */
export function createGithubFetch(opts) {
  const token = opts.token;
  const base = (opts.apiUrl || 'https://api.github.com').replace(/\/$/, '');

  return function githubFetch(path, init = {}) {
    const url = path.startsWith('http') ? path : `${base}${path}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...init, headers });
  };
}
