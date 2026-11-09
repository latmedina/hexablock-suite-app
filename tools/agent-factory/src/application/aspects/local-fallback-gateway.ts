import type { ILlmGateway, LlmRequest, LlmResponse } from '../ports';
import { ProviderExhaustedError } from './retry-gateway';

/** Account-wide exhaustion lasts until UTC midnight, including across HTTP requests. */
const QUOTA = Symbol.for('hexablock.agent-factory.cloud-exhausted-until');
export class LocalFallbackGateway implements ILlmGateway {
  constructor(private readonly cloud: ILlmGateway | undefined, private readonly local: ILlmGateway | undefined) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    request.signal?.throwIfAborted();
    const holder = globalThis as Record<symbol, number | undefined>;
    if (this.cloud && (!this.local || (holder[QUOTA] ?? 0) <= Date.now())) {
      try {
        return await this.cloud.complete(request);
      } catch (error) {
        request.signal?.throwIfAborted();
        if (!this.local || (error instanceof Error && error.name === 'PaidModelError')) throw error;
        if (error instanceof ProviderExhaustedError) {
          const midnight = new Date();
          midnight.setUTCHours(24, 0, 0, 0);
          holder[QUOTA] = midnight.getTime();
        }
      }
    }
    if (!this.local) throw new Error('No provider configured. Set OPENROUTER_API_KEY or enable Ollama.');
    return this.local.complete(request);
  }
}
