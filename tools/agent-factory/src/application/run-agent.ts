import { z } from 'zod';
import type { AgentDefinition, AgentRunResult, ChatMessage } from '../domain/agent';
import type { ModuleKey } from '../domain/modules';
import { extractJson } from './json-output';
import type { ILlmGateway, IPromptRepository } from './ports';

export interface RunAgentInput {
  readonly userPrompt: string;
  readonly moduleKey?: ModuleKey;
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
    while (attempts < 2) {
      attempts += 1;
      const response = await this.llm.complete({
        models: this.definition.models,
        messages,
        temperature: this.definition.temperature,
        maxTokens: this.definition.maxTokens,
      });
      lastRaw = response.content;
      const parsed = this.parse(response.content);
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

  private parse(raw: string): { success: true; data: TOut } | { success: false; issues: string } {
    let json: unknown;
    try {
      json = extractJson(raw);
    } catch (error) {
      return { success: false, issues: `not valid JSON (${(error as Error).message})` };
    }
    const result = this.definition.output.safeParse(json);
    if (result.success) return { success: true, data: result.data };
    return { success: false, issues: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ') };
  }
}
