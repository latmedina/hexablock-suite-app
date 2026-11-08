import type { AgentRunResult } from '../../domain/agent';
import type { IClock, IRunLog } from '../ports';
import type { RunAgent, RunAgentInput } from '../run-agent';

/**
 * Aspect (Decorator over RunAgent): records every run (agent, model, prompt, outcome) so the team can
 * fill AI_USAGE.md with real data. Agents never call the logger themselves.
 */
export class LoggedAgent<TOut> {
  constructor(
    private readonly inner: RunAgent<TOut>,
    private readonly log: IRunLog,
    private readonly clock: IClock,
    private readonly runId: string,
  ) {}

  get id() {
    return this.inner.id;
  }

  async execute(input: RunAgentInput): Promise<AgentRunResult<TOut>> {
    const started = this.clock.now();
    try {
      const result = await this.inner.execute(input);
      await this.log.append({ runId: this.runId, agentId: this.inner.id, modelUsed: result.modelUsed, startedAt: started.toISOString(), durationMs: this.clock.now().getTime() - started.getTime(), ok: true, attempts: result.attempts, userPrompt: input.userPrompt });
      return result;
    } catch (error) {
      await this.log.append({ runId: this.runId, agentId: this.inner.id, modelUsed: '-', startedAt: started.toISOString(), durationMs: this.clock.now().getTime() - started.getTime(), ok: false, attempts: 0, userPrompt: input.userPrompt, error: (error as Error).message });
      throw error;
    }
  }
}
