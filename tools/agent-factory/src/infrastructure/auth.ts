import { timingSafeEqual } from 'node:crypto';

/** Cookie set by POST /api/session so the dashboard (and its EventSource, which cannot send headers) is authorized. */
export const AUTH_COOKIE = 'factory_token';

/**
 * Optional shared-secret guard for the HTTP API. When FACTORY_TOKEN is set (needed as soon as the app
 * listens on a network interface, e.g. for n8n over Tailscale), every request must send
 * `Authorization: Bearer <FACTORY_TOKEN>` or the dashboard cookie. Unset = local-only use, no check.
 */
export function isAuthorized(req: Request, token = process.env.FACTORY_TOKEN): boolean {
  if (!token) return true;
  const header = req.headers.get('authorization');
  if (header) return sameSecret(header.replace(/^Bearer\s+/i, ''), token);
  const cookie = readCookie(req.headers.get('cookie') ?? '', AUTH_COOKIE);
  return cookie !== undefined && sameSecret(cookie, token);
}

export function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readCookie(header: string, name: string): string | undefined {
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
