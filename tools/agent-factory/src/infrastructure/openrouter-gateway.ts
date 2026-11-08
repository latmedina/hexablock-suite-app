import { LlmHttpError } from '../application/aspects/retry-gateway';
import type { ILlmGateway, LlmRequest, LlmResponse } from '../application/ports';
import { assertFreeModel } from '../domain/free-model';

export interface OpenRouterConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly appUrl: string;
  readonly appTitle: string;
  readonly timeoutMs: number;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
  error?: { code?: number; message?: string };
}

type FetchFn = typeof fetch;

/**
 * Adapter to OpenRouter's OpenAI-compatible endpoint, using plain `fetch` (no SDK).
 * Sends the whole free model chain in `models`: OpenRouter falls back to the next one on error/429.
 */
export class OpenRouterGateway implements ILlmGateway {
  constructor(private readonly config: OpenRouterConfig, private readonly fetchFn: FetchFn = fetch) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    request.models.forEach((m) => assertFreeModel(m)); // last line of defence before money can be spent
    const [primary, ...fallbacks] = request.models;
    if (!primary) throw new Error('At least one model is required');

    const body = {
      model: primary,
      ...(fallbacks.length > 0 ? { models: [primary, ...fallbacks] } : {}),
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    };

    const res = await this.fetchFn(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.config.appUrl,
        'X-Title': this.config.appTitle,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    const text = await res.text();
    let json: ChatCompletionResponse = {};
    try {
      json = text ? (JSON.parse(text) as ChatCompletionResponse) : {};
    } catch {
      /* non-JSON error page */
    }

    if (!res.ok || json.error) {
      const status = res.ok ? (json.error?.code ?? 500) : res.status;
      const retryAfter = Number(res.headers.get('retry-after'));
      const detail = json.error?.message ?? text.slice(0, 300);
      // Account-wide privacy settings (ZDR, no training) exclude every free endpoint: say how to fix it.
      const hint = /data policy|ZDR/i.test(detail) ? ' -> Free models need https://openrouter.ai/settings/privacy: turn off "ZDR Endpoints Only" and allow free endpoints.' : '';
      throw new LlmHttpError(status, `OpenRouter ${status}: ${detail}${hint}`, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmHttpError(502, `OpenRouter returned an empty reply (finish_reason=${json.choices?.[0]?.finish_reason ?? 'unknown'}). Raise maxTokens if it was "length".`);
    }
    return {
      content,
      modelUsed: json.model ?? primary,
      usage: json.usage ? { promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens } : undefined,
    };
  }
}
