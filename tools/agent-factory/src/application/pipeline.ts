import type { AgentRunResult } from '../domain/agent';
import type { ArchitectSpec, FilePatch, ReviewReport } from '../domain/contracts';
import { removedExports } from '../domain/exports';
import { isPathInsideModule, MODULES, type RepoKey } from '../domain/modules';
import type { IPatchVerifier, IRepoFiles, IRunEvents, StepId, VerifyReport } from './ports';
import { NO_EVENTS, RunEvents } from './run-events';
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

export class UnapprovedOverwriteError extends Error {
  constructor(readonly paths: string[]) {
    super(`Dev agent tried to replace existing files the spec did not mark "to_modify": ${paths.join(', ')}`);
    this.name = 'UnapprovedOverwriteError';
  }
}

export class RemovedExportsError extends Error {
  constructor(readonly removed: Record<string, string[]>) {
    super(`Dev agent removed exports other code may import: ${Object.entries(removed).map(([p, names]) => `${p} (${names.join(', ')})`).join('; ')}`);
    this.name = 'RemovedExportsError';
  }
}

export interface ArchitectToDevResult {
  readonly spec: AgentRunResult<ArchitectSpec>;
  readonly patch: AgentRunResult<FilePatch>;
  /** Present when a verifier is configured: the checks of the LAST patch. */
  readonly verification?: VerifyReport;
  /** Dev repair rounds that followed a failed verification (0 = first patch passed or no verifier). */
  readonly repairRounds: number;
  /** Present when a reviewer is configured and answered; reviewError when it did not. */
  readonly review?: AgentRunResult<ReviewReport>;
  readonly reviewError?: string;
}

export interface PipelineOptions {
  /** Applies the patch to a throwaway copy of the repo and runs tsc/jest/lint. */
  readonly verifier?: IPatchVerifier;
  /** Dev repair rounds allowed after a failed verification. */
  readonly maxRepairRounds?: number;
  /** Reviews the final patch (a different model family than Dev). Its verdict never blocks the patch. */
  readonly reviewer?: Runnable<ReviewReport>;
  /** Live events for the dashboard. */
  readonly events?: IRunEvents;
}

const MAX_CONTEXT_FILE_CHARS = 12_000;
const MAX_CHECK_OUTPUT_FOR_DEV = 6_000;

/**
 * Agent 1 -> Agent 2 -> verification -> review. The Architect turns a request into a validated spec, seeing the
 * real file tree of both repos. The Dev agent of the spec's repo receives that spec plus the current content of
 * every file the spec says exists or must change; its patch must stay inside the module, may only replace files
 * the spec marked `to_modify`, and must keep their exports. Guard violations go back to the agent as a repair
 * turn, then fail loudly. If a verifier is configured, the patch is type-checked and tested on a copy of the
 * repo and failures go back to Dev for up to `maxRepairRounds` rounds. Nothing is written to the real repo:
 * a human applies the patch.
 */
export class ArchitectToDevPipeline {
  private readonly events: IRunEvents;

  constructor(
    private readonly architect: Runnable<ArchitectSpec>,
    private readonly devFor: (repo: RepoKey) => Runnable<FilePatch>,
    private readonly files: IRepoFiles,
    private readonly options: PipelineOptions = {},
  ) {
    this.events = options.events ?? new RunEvents(NO_EVENTS, 'no-run');
  }

  async run(request: string, source?: string): Promise<ArchitectToDevResult> {
    const startedAt = Date.now();
    this.events.emit({ type: 'run.started', request, source });
    try {
      const result = await this.runSteps(request);
      this.events.emit({
        type: 'run.finished',
        ok: true,
        durationMs: Date.now() - startedAt,
        verified: result.verification?.ok,
        verdict: result.review?.output.verdict,
      });
      return result;
    } catch (error) {
      this.events.emit({ type: 'run.finished', ok: false, durationMs: Date.now() - startedAt, error: `${(error as Error).name}: ${(error as Error).message}` });
      throw error;
    }
  }

  private async runSteps(request: string): Promise<ArchitectToDevResult> {
    const spec = await this.step('architect', 0, this.architect, { userPrompt: await this.architectPrompt(request) }, (out) => out);
    const moduleKey = spec.output.module;
    const repo = MODULES[moduleKey].repo;
    const existing = new Set(await this.files.list(repo, MODULES[moduleKey].paths, 2000));
    const modifiable = new Set(spec.output.interfaces.filter((i) => i.status === 'to_modify').map((i) => i.file));

    const before = new Map<string, string>();
    for (const path of modifiable) {
      if (!existing.has(path)) continue;
      const text = await this.files.read(repo, path);
      if (text !== undefined) before.set(path, text);
    }
    const droppedExports = (files: FilePatch['files']): Record<string, string[]> =>
      Object.fromEntries(
        files
          .filter((f) => before.has(f.path))
          .map((f) => [f.path, removedExports(before.get(f.path)!, f.content)] as const)
          .filter(([, names]) => names.length > 0),
      );

    const violations = (output: unknown): string[] => {
      const files = (output as FilePatch).files;
      const dropped = droppedExports(files);
      const outside = files.map((f) => f.path).filter((p) => !isPathInsideModule(moduleKey, p));
      const overwrites = files.map((f) => f.path).filter((p) => existing.has(p) && !modifiable.has(p));
      return [
        ...(outside.length ? [`files outside module ${moduleKey}: ${outside.join(', ')}`] : []),
        ...(overwrites.length ? [`these files already exist and the spec does not allow changing them; create new files instead: ${overwrites.join(', ')}`] : []),
        ...Object.entries(dropped).map(([p, names]) => `${p} must keep every export it had (other files import them); you removed: ${names.join(', ')}`),
      ];
    };

    const enforceGuards = (patch: AgentRunResult<FilePatch>): void => {
      const outside = patch.output.files.map((f) => f.path).filter((p) => !isPathInsideModule(moduleKey, p));
      if (outside.length > 0) throw new ModuleBoundaryError(outside, moduleKey);
      const overwrites = patch.output.files.map((f) => f.path).filter((p) => existing.has(p) && !modifiable.has(p));
      if (overwrites.length > 0) throw new UnapprovedOverwriteError(overwrites);
      const dropped = droppedExports(patch.output.files);
      if (Object.keys(dropped).length > 0) throw new RemovedExportsError(dropped);
    };

    const dev = this.devFor(repo);
    const devPrompt = await this.devPrompt(spec.output, repo, [...existing]);
    let patch = await this.step('dev', 0, dev, { moduleKey, check: violations, userPrompt: devPrompt }, summarizePatch);
    enforceGuards(patch);

    let verification: VerifyReport | undefined;
    let repairRounds = 0;
    const { verifier } = this.options;
    if (verifier) {
      const maxRounds = this.options.maxRepairRounds ?? 2;
      for (let round = 0; ; round += 1) {
        verification = await this.verify(verifier, repo, patch.output, round);
        if (verification.ok || round >= maxRounds) break;
        repairRounds = round + 1;
        patch = await this.step('dev', repairRounds, dev, { moduleKey, check: violations, userPrompt: repairPrompt(devPrompt, patch.output, verification) }, summarizePatch);
        enforceGuards(patch);
      }
    }

    let review: AgentRunResult<ReviewReport> | undefined;
    let reviewError: string | undefined;
    if (this.options.reviewer) {
      try {
        review = await this.step('reviewer', 0, this.options.reviewer, { moduleKey, userPrompt: reviewPrompt(spec.output, patch.output, verification) }, (out) => out);
      } catch (error) {
        reviewError = `${(error as Error).name}: ${(error as Error).message}`;
      }
    }
    return { spec, patch, verification, repairRounds, review, reviewError };
  }

  /** Runs one agent and reports it as a dashboard step. */
  private async step<TOut>(step: StepId, round: number, agent: Runnable<TOut>, input: RunAgentInput, data: (out: TOut) => unknown): Promise<AgentRunResult<TOut>> {
    const startedAt = Date.now();
    this.events.emit({ type: 'step.started', step, round, agentId: agent.id });
    try {
      const result = await agent.execute({
        ...input,
        onAttempt: (a) => this.events.emit({ type: 'step.attempt', step, round, attempt: a.attempt, model: a.model, ok: a.ok, issues: a.issues, durationMs: a.durationMs, usage: a.usage }),
      });
      this.events.emit({ type: 'step.finished', step, round, ok: true, durationMs: Date.now() - startedAt, model: result.modelUsed, attempts: result.attempts, data: data(result.output) });
      return result;
    } catch (error) {
      this.events.emit({ type: 'step.finished', step, round, ok: false, durationMs: Date.now() - startedAt, error: `${(error as Error).name}: ${(error as Error).message}` });
      throw error;
    }
  }

  private async verify(verifier: IPatchVerifier, repo: RepoKey, patch: FilePatch, round: number): Promise<VerifyReport> {
    const startedAt = Date.now();
    this.events.emit({ type: 'step.started', step: 'verify', round });
    try {
      const report = await verifier.verify(repo, patch.files);
      this.events.emit({ type: 'step.finished', step: 'verify', round, ok: report.ok, durationMs: Date.now() - startedAt, data: report });
      return report;
    } catch (error) {
      this.events.emit({ type: 'step.finished', step: 'verify', round, ok: false, durationMs: Date.now() - startedAt, error: (error as Error).message });
      throw error;
    }
  }

  private async architectPrompt(request: string): Promise<string> {
    const [app, api] = await Promise.all([
      this.files.list('app', ['src/', 'test/', 'docs/specs/', 'assets/levels/'], 400),
      this.files.list('api', ['src/', 'test/', 'prisma/'], 300),
    ]);
    return [
      request,
      '',
      'Files that exist today (mark them `exists` or `to_modify`, never `to_create`; read their names before inventing new ones):',
      '```text',
      ...app.map((p) => `app:${p}`),
      ...api.map((p) => `api:${p}`),
      '```',
    ].join('\n');
  }

  private async devPrompt(spec: ArchitectSpec, repo: RepoKey, existing: string[]): Promise<string> {
    const referenced = [...new Set(spec.interfaces.filter((i) => i.status !== 'to_create').map((i) => i.file))];
    const contents = await Promise.all(
      referenced.map(async (path) => {
        const text = await this.files.read(repo, path);
        return text === undefined ? `### ${path}\n(not found: treat as to_create)` : `### ${path}\n\`\`\`ts\n${text.slice(0, MAX_CONTEXT_FILE_CHARS)}\n\`\`\``;
      }),
    );
    return [
      'Implement the following approved spec. Do not change its interfaces or acceptance tests.',
      '```json',
      JSON.stringify(spec, null, 2),
      '```',
      '',
      'Existing files in this module (you may only REPLACE the ones the spec marks `to_modify`; keep every export other code uses):',
      existing.length ? existing.map((p) => `- ${p}`).join('\n') : '(none)',
      '',
      'Current content of the files the spec references:',
      contents.length ? contents.join('\n\n') : '(none)',
    ].join('\n');
  }
}

/** What the dashboard shows for a Dev step: the files, with content, so they can be opened. */
function summarizePatch(patch: FilePatch): unknown {
  return patch;
}

function tail(text: string, max: number): string {
  return text.length <= max ? text : `…${text.slice(-max)}`;
}

function repairPrompt(devPrompt: string, previous: FilePatch, report: VerifyReport): string {
  const failed = report.checks.filter((c) => !c.ok);
  return [
    devPrompt,
    '',
    '## Your previous patch',
    '```json',
    JSON.stringify(previous, null, 2),
    '```',
    '',
    '## It was applied to a copy of the repository and these checks FAILED',
    ...failed.map((c) => `### ${c.name}\n\`\`\`text\n${tail(c.output, Math.floor(MAX_CHECK_OUTPUT_FOR_DEV / Math.max(1, failed.length)))}\n\`\`\``),
    '',
    'Fix every error above. Reply with the FULL corrected patch (every file, complete content), not a diff.',
    'Keep the same interfaces and acceptance test names. Relative imports must resolve from each file\'s folder.',
  ].join('\n');
}

function reviewPrompt(spec: ArchitectSpec, patch: FilePatch, report: VerifyReport | undefined): string {
  return [
    'Review this patch against its spec and the repository rules.',
    '## Spec',
    '```json',
    JSON.stringify(spec, null, 2),
    '```',
    '## Patch',
    ...patch.files.map((f) => `### ${f.action} ${f.path}\n\`\`\`ts\n${f.content}\n\`\`\``),
    '## Automatic checks (type check, tests, lint) on the patched repository',
    report ? report.checks.map((c) => `- ${c.name}: ${c.ok ? 'passed' : 'FAILED'}${c.ok ? '' : `\n\`\`\`text\n${tail(c.output, 1500)}\n\`\`\``}`).join('\n') : '(not run)',
  ].join('\n');
}
