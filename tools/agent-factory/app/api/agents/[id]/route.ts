import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AGENT_IDS } from '../../../../src/domain/agent';
import { isPathInsideModule, MODULE_KEYS } from '../../../../src/domain/modules';
import { isAuthorized } from '../../../../src/infrastructure/auth';
import { AgentFactory } from '../../../../src/main/agent-factory';
import { finishRun, registerRun } from '../../../../src/infrastructure/run-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ prompt: z.string().min(1).max(60000), module: z.enum(MODULE_KEYS).optional() });

/**
 * Dev agents write code, so they only run through /api/pipeline, which gives them the approved spec and the
 * repo context and blocks writes outside the module or over existing files.
 */
const PIPELINE_ONLY_AGENTS: readonly string[] = ['dev-app', 'dev-api'];

/** POST /api/agents/<id>  { "prompt": "...", "module": "app/domain-core" }  -> runs one agent (not the Dev agents). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const agentId = z.enum(AGENT_IDS).safeParse(id);
  if (!agentId.success) return NextResponse.json({ error: `Unknown agent "${id}". Known: ${AGENT_IDS.join(', ')}` }, { status: 404 });
  if (PIPELINE_ONLY_AGENTS.includes(agentId.data)) {
    return NextResponse.json({ error: 'UsePipeline', message: `"${agentId.data}" only runs through POST /api/pipeline, which enforces the module and overwrite guards.` }, { status: 409 });
  }
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Body must be { "prompt": string, "module"?: ModuleKey }' }, { status: 400 });

  let runId: string | undefined;
  try {
    const factory = AgentFactory.fromEnv();
    runId = factory.runId;
    const controller = registerRun(runId);
    const result = await factory.create(agentId.data).execute({ userPrompt: body.data.prompt, moduleKey: body.data.module, signal: AbortSignal.any([controller.signal, req.signal]) });
    const moduleKey = body.data.module;
    const output = result.output as { files?: Array<{ path: string }> };
    const outside = moduleKey && output.files ? output.files.map((f) => f.path).filter((p) => !isPathInsideModule(moduleKey, p)) : [];
    if (outside.length > 0) {
      return NextResponse.json({ error: 'ModuleBoundaryError', message: `Agent wrote outside module "${moduleKey}"`, paths: outside, output: result.output }, { status: 422 });
    }
    return NextResponse.json({ runId: factory.runId, agent: result.agentId, model: result.modelUsed, attempts: result.attempts, output: result.output });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.name, message: err.message }, { status: err.name === 'FactoryDrainingError' ? 503 : 502 });
  } finally {
    if (runId) finishRun(runId);
  }
}
