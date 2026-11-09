import type { ILlmGateway, LlmRequest, LlmResponse } from '../ports';

/**
 * Aspect (Decorator over ILlmGateway): OpenRouter's own `models` fallback does not cover every failure
 * (empty replies, provider errors after routing). If the chained call fails, try each fallback model
 * alone, in order, and only then give up with the last error.
 */
export class FallbackLlmGateway implements ILlmGateway {
  constructor(private readonly inner: ILlmGateway) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    try {
      return await this.inner.complete(request);
    } catch (firstError) {
      let lastError = firstError;
      for (const model of request.models.slice(1)) {
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
}
