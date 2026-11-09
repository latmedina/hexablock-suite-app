import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorized } from '../../../src/infrastructure/auth';
import { readEnv } from '../../../src/config/env';
import { archiveRun } from '../../../src/infrastructure/run-archive';
import { finishRun, registerRun } from '../../../src/infrastructure/run-registry';
import { AgentFactory } from '../../../src/main/agent-factory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ request: z.string().min(10).max(8000), source: z.enum(['n8n', 'web', 'api']).optional() });

/** The agents' output was rejected (invalid JSON or a broken guard) even after the repair turn. */
const GUARD_ERRORS = new Set(['ModuleBoundaryError', 'UnapprovedOverwriteError', 'RemovedExportsError', 'AgentOutputError']);
const CANCELLED = 'RunCancelledError';

/**
 * POST /api/pipeline  { "request": "..." }  -> Architect -> Dev -> verification (+ repair) -> Reviewer.
 * Returns spec, patch, check results and review, and saves them under .runs/<runId>/.
 * This is the only way to run the Dev agents: it gives them the repo context and enforces the module and
 * overwrite guards. The n8n workflow calls this route.
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Body must be { "request": string (10..8000 chars) }' }, { status: 400 });

  let runId: string | undefined;
  try {
    const factory = AgentFactory.fromEnv();
    runId = factory.runId;
    // Cancelled from the dashboard, or by the caller hanging up (e.g. an n8n timeout).
    const controller = registerRun(runId);
    const result = await factory.architectToDev(AbortSignal.any([controller.signal, req.signal])).run(parsed.data.request, parsed.data.source ?? 'api');
    const { spec, patch, verification, review } = result;
    await archiveRun(readEnv().runsDir, factory.runId, result).catch(() => undefined);
    return NextResponse.json({
      runId: factory.runId,
      status: result.status,
      architect: { model: spec.modelUsed, attempts: spec.attempts, spec: spec.output },
      dev: { model: patch.modelUsed, attempts: patch.attempts, repairRounds: result.repairRounds, patch: patch.output },
      verification: verification ?? null,
      review: review ? { model: review.modelUsed, ...review.output } : result.reviewError ? { error: result.reviewError } : null,
    });
  } catch (error) {
    const err = error as Error;
    const status = err.name === CANCELLED ? 409 : GUARD_ERRORS.has(err.name) ? 422 : 502;
    return NextResponse.json({ error: err.name, message: err.message, runId }, { status });
  } finally {
    if (runId) finishRun(runId);
  }
}
