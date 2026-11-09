import { z } from 'zod';
import type { AgentDefinition, AgentRunResult, ChatMessage } from '../domain/agent';
import type { ModuleKey } from '../domain/modules';
import { extractJson } from './json-output';
import type { ILlmGateway, IPromptRepository } from './ports';

export interface RunAgentInput {
  readonly userPrompt: string;
  readonly moduleKey?: ModuleKey;
  /** Extra domain checks on a schema-valid output; returned issues trigger the repair turn. */
  readonly check?: (output: unknown) => readonly string[];
  /** Called after every model reply (valid or not), for the live dashboard. */
  readonly onAttempt?: (attempt: AttemptInfo) => void;
  /** Cancels the model call when the run is cancelled. */
  readonly signal?: AbortSignal;
  /** Starts the model chain this many places later, so a retry is led by a different model. */
  readonly modelOffset?: number;
}

export interface AttemptInfo {
  readonly attempt: number;
  readonly model: string;
  readonly ok: boolean;
  readonly issues?: string;
  readonly durationMs: number;
  readonly usage?: { promptTokens: number; completionTokens: number };
}

export class AgentOutputError extends Error {
  constructor(agentId: string, readonly issues: string, readonly raw: string) {
    super(`Agent "${agentId}" returned invalid output after repair attempt: ${issues}`);
    this.name = 'AgentOutputError';
  }
}

/**
 * Template Method for every agent: build messages -> call model -> parse JSON -> validate with the
 * agent's contract -> if invalid, one repair turn with the validation errors -> fail loudly.
 */
export class RunAgent<TOut> {
  constructor(
    private readonly definition: AgentDefinition<TOut>,
    private readonly llm: ILlmGateway,
    private readonly prompts: IPromptRepository,
  ) {}

  get id() {
    return this.definition.id;
  }

  async execute(input: RunAgentInput): Promise<AgentRunResult<TOut>> {
    const messages: ChatMessage[] = [
      { role: 'system', content: await this.buildSystemPrompt(input.moduleKey) },
      { role: 'user', content: input.userPrompt },
    ];

    let attempts = 0;
    let lastIssues = '';
    let lastRaw = '';
    const maxAttempts = this.definition.maxAttempts ?? 2;
    while (attempts < maxAttempts) {
      attempts += 1;
      // The repair turn starts from the next model: the one that just failed is the least likely to fix it.
      const models = rotate(this.definition.models, (input.modelOffset ?? 0) + attempts - 1);
      const startedAt = Date.now();
      const response = await this.llm.complete({
        models,
        messages,
        temperature: this.definition.temperature,
        maxTokens: this.definition.maxTokens,
        timeoutMs: this.definition.timeoutMs,
        signal: input.signal,
      });
      lastRaw = response.content;
      const parsed = this.parse(response.content, input.check);
      input.onAttempt?.({ attempt: attempts, model: response.modelUsed, ok: parsed.success, issues: parsed.success ? undefined : parsed.issues, durationMs: Date.now() - startedAt, usage: response.usage });
      if (parsed.success) {
        return { agentId: this.definition.id, modelUsed: response.modelUsed, output: parsed.data, raw: response.content, attempts, usage: response.usage };
      }
      lastIssues = parsed.issues;
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: `Your previous reply is INVALID: ${parsed.issues}\nReply again with ONLY the corrected JSON object. No prose, no markdown fences.`,
      });
    }
    throw new AgentOutputError(this.definition.id, lastIssues, lastRaw);
  }

  private async buildSystemPrompt(moduleKey?: ModuleKey): Promise<string> {
    const base = await this.prompts.systemPrompt(this.definition.promptFile);
    const schema = JSON.stringify(z.toJSONSchema(this.definition.output), null, 2);
    const parts = [base, `## Output JSON Schema (your reply MUST validate against it)\n\n${schema}`];
    if (this.definition.needsModuleContext && moduleKey) {
      parts.push(`## Repository rules for module "${moduleKey}" (binding)\n\n${await this.prompts.moduleContext(moduleKey)}`);
    }
    return parts.join('\n\n');
  }

  private parse(raw: string, check?: RunAgentInput['check']): { success: true; data: TOut } | { success: false; issues: string } {
    let json: unknown;
    try {
      json = extractJson(raw);
    } catch (error) {
      return { success: false, issues: `not valid JSON (${(error as Error).message})` };
    }
    const result = this.definition.output.safeParse(json);
    if (result.success) {
      const issues = check?.(result.data) ?? [];
      return issues.length === 0 ? { success: true, data: result.data } : { success: false, issues: issues.join('; ') };
    }
    return { success: false, issues: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') };
  }
}

function rotate<T>(items: readonly T[], by: number): T[] {
  if (items.length === 0) return [];
  const k = ((by % items.length) + items.length) % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}
