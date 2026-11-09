import { ProviderExhaustedError } from './retry-gateway';
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
        const timeout = AbortSignal.timeout(request.timeoutMs ?? 180_000);
        const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
        return await this.inner.complete({ ...request, models: [model], signal });
      } catch (error) {
        if (request.signal?.aborted || error instanceof ProviderExhaustedError || (error instanceof Error && error.name === 'PaidModelError')) throw error;
        lastError = error;
      }
    }
    throw lastError;
  }
}
