import { NextResponse } from 'next/server';
import { isAuthorized } from '../../../../../src/infrastructure/auth';
import { cancelRun } from '../../../../../src/infrastructure/run-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/runs/<runId>/cancel -> stops the run's current model call or check; no further step starts. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  return cancelRun(id) ? NextResponse.json({ cancelled: true }) : NextResponse.json({ error: 'Run is not running in this process' }, { status: 404 });
}
