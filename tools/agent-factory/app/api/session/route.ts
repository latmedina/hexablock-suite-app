import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE, isAuthorized, sameSecret } from '../../../src/infrastructure/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ token: z.string().min(1).max(500) });

/** GET /api/session -> 200 if this browser is already authorized (or no token is configured), else 401. */
export async function GET(req: Request) {
  return NextResponse.json({ authorized: isAuthorized(req), tokenRequired: Boolean(process.env.FACTORY_TOKEN) }, { status: isAuthorized(req) ? 200 : 401 });
}

/** POST /api/session { "token": "..." } -> sets an HttpOnly cookie so the dashboard can stream events. */
export async function POST(req: Request) {
  const expected = process.env.FACTORY_TOKEN;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (expected && (!body.success || !sameSecret(body.data.token, expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = NextResponse.json({ authorized: true });
  if (expected) {
    res.cookies.set(AUTH_COOKIE, expected, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
