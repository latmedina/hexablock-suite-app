import type { z } from 'zod';
import type { FreeModelId } from './free-model';

/** Identifiers of every agent in the factory. Adding an agent = new id + entry in agents.config.ts + prompt file. */
export const AGENT_IDS = ['router', 'architect', 'dev-app', 'dev-api', 'qa', 'reviewer', 'level-designer', 'docs'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

/** Declarative description of an agent. The factory turns it into a runnable agent. */
export interface AgentDefinition<TOut = unknown> {
  readonly id: AgentId;
  readonly role: string;
  /** Primary model first, then free fallbacks (OpenRouter tries them in order). */
  readonly models: readonly FreeModelId[];
  /** File name inside `prompts/`. */
  readonly promptFile: string;
  /** Validates the agent output. Its JSON Schema is appended to the system prompt. */
  readonly output: z.ZodType<TOut>;
  readonly temperature: number;
  readonly maxTokens: number;
  /** Per-call time limit; overrides OPENROUTER_TIMEOUT_MS so a stalled free model fails over sooner. */
  readonly timeoutMs?: number;
  /** Load root + module AGENTS.md of the target module into the system prompt. */
  readonly needsModuleContext: boolean;
}

export interface AgentRunResult<TOut> {
  readonly agentId: AgentId;
  readonly modelUsed: string;
  readonly output: TOut;
  readonly raw: string;
  readonly attempts: number;
  readonly usage?: { promptTokens: number; completionTokens: number };
}
