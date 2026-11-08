import type { AgentRunResult } from '../domain/agent';
import type { ArchitectSpec, FilePatch } from '../domain/contracts';
import { isPathInsideModule, MODULES, type RepoKey } from '../domain/modules';
import type { IRepoFiles } from './ports';
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

export interface ArchitectToDevResult {
  readonly spec: AgentRunResult<ArchitectSpec>;
  readonly patch: AgentRunResult<FilePatch>;
}

const MAX_CONTEXT_FILE_CHARS = 12_000;

/**
 * Agent 1 -> Agent 2. The Architect turns a request into a validated spec, seeing the real file tree of
 * both repos. The Dev agent of the spec's repo receives that spec plus the current content of every file
 * the spec says exists or must change, and its patch must stay inside the module and may only replace
 * files the spec marked `to_modify`. Violations go back to the agent as a repair turn, then fail loudly.
 * Nothing is written to disk here: a human applies the patch.
 */
export class ArchitectToDevPipeline {
  constructor(
    private readonly architect: Runnable<ArchitectSpec>,
    private readonly devFor: (repo: RepoKey) => Runnable<FilePatch>,
    private readonly files: IRepoFiles,
  ) {}

  async run(request: string): Promise<ArchitectToDevResult> {
    const spec = await this.architect.execute({ userPrompt: await this.architectPrompt(request) });
    const moduleKey = spec.output.module;
    const repo = MODULES[moduleKey].repo;
    const existing = new Set(await this.files.list(repo, MODULES[moduleKey].paths, 2000));
    const modifiable = new Set(spec.output.interfaces.filter((i) => i.status === 'to_modify').map((i) => i.file));

    const violations = (output: unknown): string[] => {
      const files = (output as FilePatch).files;
      const outside = files.map((f) => f.path).filter((p) => !isPathInsideModule(moduleKey, p));
      const overwrites = files.map((f) => f.path).filter((p) => existing.has(p) && !modifiable.has(p));
      return [
        ...(outside.length ? [`files outside module ${moduleKey}: ${outside.join(', ')}`] : []),
        ...(overwrites.length ? [`these files already exist and the spec does not allow changing them; create new files instead: ${overwrites.join(', ')}`] : []),
      ];
    };

    const patch = await this.devFor(repo).execute({
      moduleKey,
      check: violations,
      userPrompt: await this.devPrompt(spec.output, repo, [...existing]),
    });

    const outside = patch.output.files.map((f) => f.path).filter((p) => !isPathInsideModule(moduleKey, p));
    if (outside.length > 0) throw new ModuleBoundaryError(outside, moduleKey);
    const overwrites = patch.output.files.map((f) => f.path).filter((p) => existing.has(p) && !modifiable.has(p));
    if (overwrites.length > 0) throw new UnapprovedOverwriteError(overwrites);
    return { spec, patch };
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
