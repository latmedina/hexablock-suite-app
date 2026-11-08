import type { ILlmGateway, IPromptRepository, IRepoFiles, IRunLog, AgentRunRecord, LlmRequest, LlmResponse } from '../src/application/ports';
import type { ModuleKey, RepoKey } from '../src/domain/modules';

export class ScriptedLlm implements ILlmGateway {
  readonly requests: LlmRequest[] = [];
  constructor(private readonly replies: Array<string | Error>) {}
  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request);
    const next = this.replies.shift();
    if (next === undefined) throw new Error('ScriptedLlm: no more replies');
    if (next instanceof Error) throw next;
    return { content: next, modelUsed: request.models[0] ?? 'none' };
  }
}

export class InMemoryPrompts implements IPromptRepository {
  async systemPrompt(file: string) {
    return `PROMPT:${file}`;
  }
  async moduleContext(moduleKey: ModuleKey) {
    return `RULES:${moduleKey}`;
  }
}

export class MemoryRunLog implements IRunLog {
  readonly records: AgentRunRecord[] = [];
  async append(record: AgentRunRecord) {
    this.records.push(record);
  }
}

export const validSpec = {
  id: 'P2-hex-geometry',
  title: 'Hex geometry',
  module: 'app/domain-core',
  layers: ['domain'],
  goal: 'Generic geometry',
  interfaces: [{ file: 'src/domain/geometry/HexGeometry.ts', name: 'HexGeometry', kind: 'class', status: 'to_create', signature: 'class HexGeometry { distance(a: HexCoord, b: HexCoord): number }' }],
  patterns: [],
  rules: ['distance = max(|dq|,|dr|,|ds|)'],
  acceptanceTests: ['should_return_0_when_same_cell', 'should_return_1_when_neighbours', 'should_return_2_when_two_steps_apart'],
  outOfScope: [],
  openQuestions: [],
};

export const validPatch = (path = 'src/domain/geometry/HexGeometry.ts') => ({
  files: [{ path, action: 'create', content: 'export class HexGeometry {}' }],
  notes: 'done',
  assumptions: [],
});

export class InMemoryRepoFiles implements IRepoFiles {
  constructor(private readonly files: Record<string, string> = {}) {}
  async exists(repo: RepoKey, path: string) {
    return `${repo}:${path}` in this.files;
  }
  async read(repo: RepoKey, path: string) {
    return this.files[`${repo}:${path}`];
  }
  async list(repo: RepoKey, folders: readonly string[]) {
    return Object.keys(this.files)
      .filter((k) => k.startsWith(`${repo}:`))
      .map((k) => k.slice(repo.length + 1))
      .filter((p) => folders.some((f) => (f.endsWith('/') ? p.startsWith(f) : p === f)))
      .sort();
  }
}
