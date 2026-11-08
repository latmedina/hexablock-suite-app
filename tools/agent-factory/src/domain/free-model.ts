/**
 * Hard constraint of the factory: only 100% free OpenRouter models.
 * A model id is accepted only if it carries the `:free` suffix (or is the free router itself).
 * `npm run models:check` additionally verifies live that its pricing is 0 in /api/v1/models.
 */
export type FreeModelId = string & { readonly __brand: 'FreeModelId' };

const FREE_ROUTER = 'openrouter/free';

export class PaidModelError extends Error {
  constructor(modelId: string) {
    super(`Model "${modelId}" is not a free OpenRouter model (missing ":free" suffix). Paid models are forbidden.`);
    this.name = 'PaidModelError';
  }
}

export function isFreeModelId(modelId: string): boolean {
  return modelId === FREE_ROUTER || /^[a-z0-9._-]+\/[a-z0-9._-]+:free$/i.test(modelId);
}

export function assertFreeModel(modelId: string): FreeModelId {
  if (!isFreeModelId(modelId)) throw new PaidModelError(modelId);
  return modelId as FreeModelId;
}
