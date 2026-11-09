import type { ILlmGateway, LlmRequest, LlmResponse } from '../ports';

/**
 * Aspect (Decorator over ILlmGateway): asks each model of the chain ALONE, in order, each with its own time limit
 * (3 min by default). A model that times out, answers empty or errors hands over to the next one at once, so a
 * stalled free model never holds the run for more than one time limit.
 */
export class FallbackLlmGateway implements ILlmGateway {
  constructor(private readonly inner: ILlmGateway) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    let lastError: unknown = new Error('At least one model is required');
    for (const model of request.models) {
      if (request.signal?.aborted) throw lastError;
      try {
        return await this.inner.complete({ ...request, models: [model] });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}
