import { LlmHttpError } from '../application/aspects/retry-gateway';
import type { ILlmGateway, LlmRequest, LlmResponse } from '../application/ports';

export const DEFAULT_LOCAL_MODEL = 'qwen2.5-coder:7b';

export function localConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const baseUrl = (env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
  const url = new URL(baseUrl);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/') {
    throw new Error('Ollama must use a loopback HTTP address. Remote providers are not allowed.');
  }
  const model = env.OLLAMA_MODEL ?? DEFAULT_LOCAL_MODEL;
  if (!/^[a-z0-9._-]+:[a-z0-9._-]+$/i.test(model) || /cloud/i.test(model)) {
    throw new Error('OLLAMA_MODEL must be a local model tag; cloud models are forbidden.');
  }
  return { enabled: env.OLLAMA_ENABLED === '1', baseUrl, model };
}

/** Local inference uses the same output validation and verification as cloud inference. */
export class OllamaGateway implements ILlmGateway {
  constructor(private readonly config: ReturnType<typeof localConfig>, private readonly fetchFn: typeof fetch = fetch) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    request.signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(request.timeoutMs ?? 180_000);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
    const res = await this.fetchFn(`${this.config.baseUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({
        model: this.config.model, messages: request.messages, stream: false, format: 'json',
        keep_alive: '30s',
        options: { temperature: request.temperature, num_ctx: 16384, num_predict: Math.min(request.maxTokens, 8192) },
      }),
    });
    const json = await res.json() as { error?: string; message?: { content?: string }; done_reason?: string; prompt_eval_count?: number; eval_count?: number };
    if (!res.ok || json.error) throw new LlmHttpError(res.status, `Ollama: ${json.error ?? 'local inference failed'}`);
    if (json.done_reason === 'length') throw new LlmHttpError(422, 'Ollama reply was truncated; the patch was not accepted.');
    if (!json.message?.content?.trim()) throw new LlmHttpError(502, 'Ollama returned an empty reply.');
    return {
      content: json.message.content, modelUsed: `ollama/${this.config.model}`,
      usage: { promptTokens: json.prompt_eval_count ?? 0, completionTokens: json.eval_count ?? 0 },
    };
  }
}
