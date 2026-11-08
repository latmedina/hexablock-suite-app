import { timingSafeEqual } from 'node:crypto';

/**
 * Optional shared-secret guard for the HTTP API. When FACTORY_TOKEN is set (needed as soon as the app
 * listens on a network interface, e.g. for n8n over Tailscale), every request must send
 * `Authorization: Bearer <FACTORY_TOKEN>`. Unset = local-only use, no check.
 */
export function isAuthorized(req: Request, token = process.env.FACTORY_TOKEN): boolean {
  if (!token) return true;
  const header = req.headers.get('authorization') ?? '';
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
