import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorized } from '../../../src/infrastructure/auth';
import { AgentFactory } from '../../../src/main/agent-factory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ request: z.string().min(10).max(8000) });

/** The agents' output was rejected (invalid JSON or a broken guard) even after the repair turn. */
const GUARD_ERRORS = new Set(['ModuleBoundaryError', 'UnapprovedOverwriteError', 'RemovedExportsError', 'AgentOutputError']);

/**
 * POST /api/pipeline  { "request": "..." }  -> Architect (agent 1) -> Dev (agent 2). Returns spec + patch.
 * This is the only way to run the Dev agents: it gives them the repo context and enforces the module and
 * overwrite guards. The n8n workflow calls this route.
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Body must be { "request": string (10..8000 chars) }' }, { status: 400 });

  try {
    const factory = AgentFactory.fromEnv();
    const { spec, patch } = await factory.architectToDev().run(parsed.data.request);
    return NextResponse.json({
      runId: factory.runId,
      architect: { model: spec.modelUsed, attempts: spec.attempts, spec: spec.output },
      dev: { model: patch.modelUsed, attempts: patch.attempts, patch: patch.output },
    });
  } catch (error) {
    const err = error as Error;
    const status = GUARD_ERRORS.has(err.name) ? 422 : 502;
    return NextResponse.json({ error: err.name, message: err.message }, { status });
  }
}
