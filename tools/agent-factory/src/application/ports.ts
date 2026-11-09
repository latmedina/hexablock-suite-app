import type { ChatMessage } from '../domain/agent';
import type { FreeModelId } from '../domain/free-model';
import type { ModuleKey, RepoKey } from '../domain/modules';

export interface LlmRequest {
  readonly models: readonly FreeModelId[];
  readonly messages: readonly ChatMessage[];
  readonly temperature: number;
  readonly maxTokens: number;
}

export interface LlmResponse {
  readonly content: string;
  readonly modelUsed: string;
  readonly usage?: { promptTokens: number; completionTokens: number };
}

/** Port to any OpenAI-compatible chat completions provider (OpenRouter in infrastructure). */
export interface ILlmGateway {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

/** Port to the prompt files and the AGENTS.md rules of each module. */
export interface IPromptRepository {
  systemPrompt(promptFile: string): Promise<string>;
  moduleContext(moduleKey: ModuleKey): Promise<string>;
}

/** Port to the current content of the two repos, so agents build on what exists instead of guessing. */
export interface IRepoFiles {
  exists(repo: RepoKey, path: string): Promise<boolean>;
  read(repo: RepoKey, path: string): Promise<string | undefined>;
  /** Repo-relative paths of files under the given folders (sorted, capped). */
  list(repo: RepoKey, folders: readonly string[], limit?: number): Promise<string[]>;
}

export interface AgentRunRecord {
  readonly runId: string;
  readonly agentId: string;
  readonly modelUsed: string;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly ok: boolean;
  readonly attempts: number;
  readonly userPrompt: string;
  readonly error?: string;
}

/** Port used by the AI-usage aspect: every run is recorded so it can be copied into AI_USAGE.md. */
export interface IRunLog {
  append(record: AgentRunRecord): Promise<void>;
}

export interface IClock {
  now(): Date;
}

/** One command of the verification step (type check, tests, lint), run on the patched copy of a repo. */
export interface VerifyCheck {
  readonly name: string;
  readonly ok: boolean;
  /** Tail of stdout+stderr, enough to show the errors to the Dev agent and to a human. */
  readonly output: string;
  readonly durationMs: number;
}

export interface VerifyReport {
  readonly ok: boolean;
  readonly checks: readonly VerifyCheck[];
}

/** Port to the verification step: applies a patch to a throwaway copy of the repo and runs its checks. */
export interface IPatchVerifier {
  verify(repo: RepoKey, files: readonly PatchFile[]): Promise<VerifyReport>;
}

export interface PatchFile {
  readonly path: string;
  readonly action: 'create' | 'replace';
  readonly content: string;
}

/** Steps a run goes through, in order. A repair round repeats `dev` and `verify` with `round` > 0. */
export type StepId = 'architect' | 'dev' | 'verify' | 'reviewer';

/** What the live dashboard shows. Every event belongs to one run (one pipeline request). */
export type FactoryEvent =
  | { readonly type: 'run.started'; readonly runId: string; readonly at: string; readonly request: string; readonly source?: string }
  | { readonly type: 'step.started'; readonly runId: string; readonly at: string; readonly step: StepId; readonly round: number; readonly agentId?: string; readonly models?: readonly string[] }
  | { readonly type: 'step.attempt'; readonly runId: string; readonly at: string; readonly step: StepId; readonly round: number; readonly attempt: number; readonly model: string; readonly ok: boolean; readonly issues?: string; readonly durationMs: number; readonly usage?: { promptTokens: number; completionTokens: number } }
  | { readonly type: 'step.finished'; readonly runId: string; readonly at: string; readonly step: StepId; readonly round: number; readonly ok: boolean; readonly durationMs: number; readonly model?: string; readonly attempts?: number; readonly error?: string; readonly data?: unknown }
  | { readonly type: 'run.finished'; readonly runId: string; readonly at: string; readonly ok: boolean; readonly durationMs: number; readonly error?: string; readonly verified?: boolean; readonly verdict?: string; readonly status?: 'ready' | 'needs_human' };

/** Distributive Omit, so each event variant keeps its own fields. */
export type FactoryEventInput = FactoryEvent extends infer E ? (E extends FactoryEvent ? Omit<E, 'runId' | 'at'> : never) : never;

/** Port for publishing run events (live dashboard, history). Implementations must never throw. */
export interface IEventSink {
  publish(event: FactoryEvent): void;
}

/** Events of one run: stamps runId and time so callers only describe what happened. */
export interface IRunEvents {
  readonly runId: string;
  emit(event: FactoryEventInput): void;
}
