import { randomUUID } from 'node:crypto';
import { LoggedAgent } from '../application/aspects/logged-agent';
import { FallbackLlmGateway } from '../application/aspects/fallback-gateway';
import { RetryingLlmGateway } from '../application/aspects/retry-gateway';
import { ArchitectToDevPipeline, type Runnable } from '../application/pipeline';
import type { IClock, IEventSink, ILlmGateway, IPatchVerifier, IPromptRepository, IRepoFiles, IRunLog } from '../application/ports';
import { NO_EVENTS, RunEvents } from '../application/run-events';
import { RunAgent } from '../application/run-agent';
import type { AgentId } from '../domain/agent';
import { loadAgentDefinitions, type AgentDefinitions, type AgentOutputs } from '../config/agents.config';
import { readEnv } from '../config/env';
import { FsPromptRepository } from '../infrastructure/fs-prompt-repository';
import { eventHub } from '../infrastructure/event-hub';
import { FsRepoFiles } from '../infrastructure/fs-repo-files';
import { JsonlRunLog } from '../infrastructure/jsonl-run-log';
import { OpenRouterGateway } from '../infrastructure/openrouter-gateway';
import { WorktreeVerifier } from '../infrastructure/worktree-verifier';

/** Optional stages and observers of the pipeline. All off by default (tests); `fromEnv` turns them on. */
export interface FactoryExtras {
  readonly verifier?: IPatchVerifier;
  readonly maxRepairRounds?: number;
  readonly review?: boolean;
  readonly events?: IEventSink;
}

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
    private readonly files: IRepoFiles,
    private readonly clock: IClock = { now: () => new Date() },
    readonly runId: string = randomUUID(),
    private readonly extras: FactoryExtras = {},
  ) {}

  create<K extends AgentId>(id: K): Runnable<AgentOutputs[K]> {
    const definition = this.definitions[id];
    return new LoggedAgent(new RunAgent(definition, this.llm, this.prompts), this.log, this.clock, this.runId);
  }

  architectToDev(): ArchitectToDevPipeline {
    return new ArchitectToDevPipeline(this.create('architect'), (repo) => this.create(repo === 'app' ? 'dev-app' : 'dev-api'), this.files, {
      verifier: this.extras.verifier,
      maxRepairRounds: this.extras.maxRepairRounds,
      reviewer: this.extras.review ? this.create('reviewer') : undefined,
      events: new RunEvents(this.extras.events ?? NO_EVENTS, this.runId, this.clock),
    });
  }

  static fromEnv(env: Readonly<Record<string, string | undefined>> = process.env): AgentFactory {
    const cfg = readEnv(env);
    const gateway = new FallbackLlmGateway(
      new RetryingLlmGateway(
        new OpenRouterGateway({ apiKey: cfg.openRouterApiKey, baseUrl: cfg.openRouterBaseUrl, appUrl: 'https://github.com/latmedina/hexablock-suite-app', appTitle: 'HexaBlock Agent Factory', timeoutMs: cfg.timeoutMs }),
      ),
    );
    const roots = { app: cfg.appRepoRoot, api: cfg.apiRepoRoot };
    return new AgentFactory(loadAgentDefinitions(env), gateway, new FsPromptRepository(cfg.promptsDir, roots), new JsonlRunLog(cfg.runsDir), new FsRepoFiles(roots), undefined, undefined, {
      verifier: cfg.verifyPatches ? new WorktreeVerifier(roots) : undefined,
      maxRepairRounds: cfg.maxRepairRounds,
      review: cfg.reviewPatches,
      events: eventHub(cfg.runsDir),
    });
  }
}
