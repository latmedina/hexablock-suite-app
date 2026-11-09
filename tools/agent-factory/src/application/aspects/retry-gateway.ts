import { setTimeout as delay } from 'node:timers/promises';
import type { ILlmGateway, LlmRequest, LlmResponse } from '../ports';

export class LlmHttpError extends Error {
  constructor(readonly status: number, message: string, readonly retryAfterSeconds?: number) {
    super(message);
    this.name = 'LlmHttpError';
  }
}

export class ProviderExhaustedError extends LlmHttpError {
  constructor(message: string) { super(429, message); this.name = 'ProviderExhaustedError'; }
}

export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;
const realSleep: Sleep = async (ms, signal) => { await delay(ms, undefined, { signal }); };

/**
 * Aspect (Decorator over ILlmGateway): retries rate limits (429) and transient upstream errors with
 * exponential backoff, honouring Retry-After. Free models hit 429 often, so this is not optional.
 */
export class RetryingLlmGateway implements ILlmGateway {
  constructor(
    private readonly inner: ILlmGateway,
    private readonly maxRetries = 3,
    private readonly baseDelayMs = 2000,
    private readonly sleep: Sleep = realSleep,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.inner.complete(request);
      } catch (error) {
        if (request.signal?.aborted || error instanceof ProviderExhaustedError) throw error;
        const retryable = error instanceof LlmHttpError && [408, 429, 502, 503, 504].includes(error.status);
        if (!retryable || attempt >= this.maxRetries) throw error;
        const delay = error.retryAfterSeconds !== undefined ? error.retryAfterSeconds * 1000 : this.baseDelayMs * 2 ** attempt;
        await this.sleep(Math.min(delay, 60_000), request.signal);
        if (request.signal?.aborted || error instanceof ProviderExhaustedError) throw error;
      }
    }
  }
}
