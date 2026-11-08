import type { ChatMessage } from '../domain/agent';
import type { FreeModelId } from '../domain/free-model';
import type { ModuleKey } from '../domain/modules';

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
