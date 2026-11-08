import type { AgentRunResult } from '../domain/agent';
import type { ArchitectSpec, FilePatch } from '../domain/contracts';
import { isPathInsideModule, MODULES } from '../domain/modules';
import type { RunAgentInput } from './run-agent';

/** Anything that runs like an agent (a RunAgent or one of its decorators). */
export interface Runnable<TOut> {
  readonly id: string;
  execute(input: RunAgentInput): Promise<AgentRunResult<TOut>>;
}

export class ModuleBoundaryError extends Error {
  constructor(readonly offendingPaths: string[], moduleKey: string) {
    super(`Dev agent tried to write outside module "${moduleKey}": ${offendingPaths.join(', ')}`);
    this.name = 'ModuleBoundaryError';
  }
}

export interface ArchitectToDevResult {
  readonly spec: AgentRunResult<ArchitectSpec>;
  readonly patch: AgentRunResult<FilePatch>;
}

/**
 * Agent 1 -> Agent 2. The Architect turns a request into a validated spec; the Dev agent of the spec's
 * repo receives ONLY that spec (plus the module rules) and returns a patch, which is checked against the
 * module boundary before anyone sees it. Nothing is written to disk here: a human applies the patch.
 */
export class ArchitectToDevPipeline {
  constructor(
    private readonly architect: Runnable<ArchitectSpec>,
    private readonly devFor: (repo: 'app' | 'api') => Runnable<FilePatch>,
  ) {}

  async run(request: string): Promise<ArchitectToDevResult> {
    const spec = await this.architect.execute({ userPrompt: request });
    const moduleKey = spec.output.module;
    const dev = this.devFor(MODULES[moduleKey].repo);

    const patch = await dev.execute({
      moduleKey,
      userPrompt: [
        'Implement the following approved spec. Do not change its interfaces or acceptance tests.',
        '```json',
        JSON.stringify(spec.output, null, 2),
        '```',
      ].join('\n'),
    });

    const outside = patch.output.files.map((f) => f.path).filter((p) => !isPathInsideModule(moduleKey, p));
    if (outside.length > 0) throw new ModuleBoundaryError(outside, moduleKey);
    return { spec, patch };
  }
}
