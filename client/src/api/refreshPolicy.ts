// Pure helper (no imports) so server/test can exercise it. Decides whether a failed request should try to renew the
// session (refresh token) and retry. The auth endpoints that issue or revoke a session must NOT: a 401 from a wrong
// password is the real answer for the login form, not an expired session, and a failing refresh must not call itself.
export const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];

const pathOf = (url: string | undefined | null): string => {
  if (!url) return '';
  let p = url.split('?')[0].split('#')[0];
  const m = p.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i); // absolute URL: keep the path
  if (m) p = m[1] ?? '/';
  return p;
};

export const isNoRefreshPath = (url: string | undefined | null): boolean => {
  const p = pathOf(url);
  return NO_REFRESH_PATHS.some((x) => p === x || p.endsWith(x));
};

/** True only for a first 401 on a request that belongs to an existing session (e.g. /meals, /auth/me). */
export const shouldAttemptRefresh = (opts: { status?: number; url?: string | null; alreadyRetried?: boolean }): boolean =>
  opts.status === 401 && !opts.alreadyRetried && !isNoRefreshPath(opts.url);
