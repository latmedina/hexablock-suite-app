import { randomUUID } from 'node:crypto';
import { LoggedAgent } from '../application/aspects/logged-agent';
import { RetryingLlmGateway } from '../application/aspects/retry-gateway';
import { ArchitectToDevPipeline, type Runnable } from '../application/pipeline';
import type { IClock, ILlmGateway, IPromptRepository, IRunLog } from '../application/ports';
import { RunAgent } from '../application/run-agent';
import type { AgentId } from '../domain/agent';
import { loadAgentDefinitions, type AgentDefinitions, type AgentOutputs } from '../config/agents.config';
import { readEnv } from '../config/env';
import { FsPromptRepository } from '../infrastructure/fs-prompt-repository';
import { JsonlRunLog } from '../infrastructure/jsonl-run-log';
import { OpenRouterGateway } from '../infrastructure/openrouter-gateway';

/**
 * Factory + composition root. Callers ask for an agent by id; they never know which model, prompt,
 * gateway or aspects are behind it, so any of them can be swapped in one place.
 */
export class AgentFactory {
  constructor(
    private readonly definitions: AgentDefinitions,
    private readonly llm: ILlmGateway,
    private readonly prompts: IPromptRepository,
    private readonly log: IRunLog,
    private readonly clock: IClock = { now: () => new Date() },
    readonly runId: string = randomUUID(),
  ) {}

  create<K extends AgentId>(id: K): Runnable<AgentOutputs[K]> {
    const definition = this.definitions[id];
    return new LoggedAgent(new RunAgent(definition, this.llm, this.prompts), this.log, this.clock, this.runId);
  }

  architectToDev(): ArchitectToDevPipeline {
    return new ArchitectToDevPipeline(this.create('architect'), (repo) => this.create(repo === 'app' ? 'dev-app' : 'dev-api'));
  }

  static fromEnv(env: Readonly<Record<string, string | undefined>> = process.env): AgentFactory {
    const cfg = readEnv(env);
    const gateway = new RetryingLlmGateway(
      new OpenRouterGateway({ apiKey: cfg.openRouterApiKey, baseUrl: cfg.openRouterBaseUrl, appUrl: 'https://github.com/latmedina/hexablock-suite-app', appTitle: 'HexaBlock Agent Factory', timeoutMs: cfg.timeoutMs }),
    );
    return new AgentFactory(loadAgentDefinitions(env), gateway, new FsPromptRepository(cfg.promptsDir, { app: cfg.appRepoRoot, api: cfg.apiRepoRoot }), new JsonlRunLog(cfg.runsDir));
  }
}
