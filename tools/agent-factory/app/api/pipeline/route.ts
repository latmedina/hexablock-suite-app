import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AgentFactory } from '../../../src/main/agent-factory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ request: z.string().min(10).max(8000) });

/** POST /api/pipeline  { "request": "..." }  -> Architect (agent 1) -> Dev (agent 2). Returns spec + patch. */
export async function POST(req: Request) {
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
    return NextResponse.json({ error: err.name, message: err.message }, { status: 502 });
  }
}
