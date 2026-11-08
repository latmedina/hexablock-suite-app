import { describe, expect, it } from 'vitest';
import { LlmHttpError, RetryingLlmGateway } from '../src/application/aspects/retry-gateway';
import { assertFreeModel } from '../src/domain/free-model';
import { OpenRouterGateway } from '../src/infrastructure/openrouter-gateway';
import { ScriptedLlm } from './doubles';

const config = { apiKey: 'k', baseUrl: 'https://openrouter.test/api/v1', appUrl: 'https://x', appTitle: 't', timeoutMs: 1000 };
const request = {
  models: [assertFreeModel('cohere/north-mini-code:free'), assertFreeModel('nvidia/nemotron-3.5-super-vl:free')],
  messages: [{ role: 'user' as const, content: 'hi' }],
  temperature: 0,
  maxTokens: 10,
};

describe('OpenRouterGateway', () => {
  it('should_send_openai_compatible_body_with_fallback_models_when_completing', async () => {
    // Arrange
    let sent: { url: string; body: Record<string, unknown>; auth: string | null } | undefined;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('authorization') };
      return new Response(JSON.stringify({ model: 'cohere/north-mini-code:free', choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const gateway = new OpenRouterGateway(config, fakeFetch);
    // Act
    const result = await gateway.complete(request);
    // Assert
    expect(result.content).toBe('ok');
    expect(sent?.url).toBe('https://openrouter.test/api/v1/chat/completions');
    expect(sent?.auth).toBe('Bearer k');
    expect(sent?.body).toMatchObject({ model: 'cohere/north-mini-code:free', models: ['cohere/north-mini-code:free', 'nvidia/nemotron-3.5-super-vl:free'], max_tokens: 10 });
  });

  it('should_throw_llm_http_error_with_retry_after_when_rate_limited', async () => {
    // Arrange
    const fakeFetch = (async () => new Response('{"error":{"message":"rate limited"}}', { status: 429, headers: { 'retry-after': '7' } })) as unknown as typeof fetch;
    const gateway = new OpenRouterGateway(config, fakeFetch);
    // Act
    const act = gateway.complete(request);
    // Assert
    await expect(act).rejects.toMatchObject({ status: 429, retryAfterSeconds: 7 });
  });

  it('should_explain_privacy_fix_when_account_policy_excludes_free_endpoints', async () => {
    // Arrange
    const body = '{"error":{"message":"0 endpoints out of 3 requested are available matching your guardrail restrictions and data policy. ZDR violation (account settings)"}}';
    const fakeFetch = (async () => new Response(body, { status: 404 })) as unknown as typeof fetch;
    const gateway = new OpenRouterGateway(config, fakeFetch);
    // Act
    const act = gateway.complete(request);
    // Assert
    await expect(act).rejects.toThrow(/settings\/privacy/);
  });

  it('should_refuse_request_when_a_paid_model_slips_into_the_chain', async () => {
    // Arrange
    const gateway = new OpenRouterGateway(config, (async () => new Response('{}')) as unknown as typeof fetch);
    const paid = { ...request, models: ['openai/gpt-5' as never] };
    // Act
    const act = gateway.complete(paid);
    // Assert
    await expect(act).rejects.toThrow(/not a free OpenRouter model/);
  });
});

describe('RetryingLlmGateway', () => {
  it('should_retry_and_succeed_when_first_call_is_rate_limited', async () => {
    // Arrange
    const inner = new ScriptedLlm([new LlmHttpError(429, 'rate limited', 1), 'ok']);
    const waits: number[] = [];
    const gateway = new RetryingLlmGateway(inner, 3, 10, async (ms) => void waits.push(ms));
    // Act
    const result = await gateway.complete(request);
    // Assert
    expect(result.content).toBe('ok');
    expect(waits).toEqual([1000]);
  });

  it('should_not_retry_when_error_is_not_transient', async () => {
    // Arrange
    const inner = new ScriptedLlm([new LlmHttpError(401, 'bad key'), 'ok']);
    const gateway = new RetryingLlmGateway(inner, 3, 10, async () => undefined);
    // Act
    const act = gateway.complete(request);
    // Assert
    await expect(act).rejects.toMatchObject({ status: 401 });
  });
});
