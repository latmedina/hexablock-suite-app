import { afterEach, describe, expect, it } from 'vitest';
import { LocalFallbackGateway } from '../src/application/aspects/local-fallback-gateway';
import { FallbackLlmGateway } from '../src/application/aspects/fallback-gateway';
import { ProviderExhaustedError, RetryingLlmGateway } from '../src/application/aspects/retry-gateway';
import { OllamaGateway, localConfig } from '../src/infrastructure/ollama-gateway';
import { assertFreeModel, PaidModelError } from '../src/domain/free-model';
import { readEnv } from '../src/config/env';
import { ScriptedLlm } from './doubles';

const request = { models: [assertFreeModel('openrouter/free')], messages: [{ role: 'user' as const, content: 'Return JSON.' }], maxTokens: 200, temperature: 0 };
afterEach(() => { delete (globalThis as Record<symbol, unknown>)[Symbol.for('hexablock.agent-factory.cloud-exhausted-until')]; });

describe('local fallback', () => {
  it('should_skip_other_cloud_models_and_retries_when_daily_quota_is_exhausted', async () => {
    // Arrange
    const cloud = new ScriptedLlm([new ProviderExhaustedError('free-models-per-day')]);
    const local = new ScriptedLlm(['local one', 'local two']);
    const gateway = new LocalFallbackGateway(new FallbackLlmGateway(new RetryingLlmGateway(cloud)), local);
    // Act
    const first = await gateway.complete(request);
    const second = await gateway.complete(request);
    // Assert
    expect(first.content).toBe('local one');
    expect(second.content).toBe('local two');
    expect(cloud.requests).toHaveLength(1);
  });

  it('should_keep_paid_models_rejected_when_local_fallback_exists', async () => {
    // Arrange
    const local = new ScriptedLlm(['must not run']);
    const gateway = new LocalFallbackGateway(new ScriptedLlm([new PaidModelError('paid/model')]), local);
    // Act
    const result = gateway.complete(request);
    // Assert
    await expect(result).rejects.toBeInstanceOf(PaidModelError);
    expect(local.requests).toHaveLength(0);
  });

  it('should_not_start_local_inference_when_cancelled', async () => {
    // Arrange
    const controller = new AbortController();
    const local = new ScriptedLlm(['must not run']);
    const cloud = { complete: async () => { controller.abort(); throw new Error('cancelled'); } };
    const gateway = new LocalFallbackGateway(cloud, local);
    // Act
    const result = gateway.complete({ ...request, signal: controller.signal });
    // Assert
    await expect(result).rejects.toThrow();
    expect(local.requests).toHaveLength(0);
  });

  it('should_allow_local_only_mode_when_no_cloud_key_exists', async () => {
    // Arrange
    const gateway = new LocalFallbackGateway(undefined, new ScriptedLlm(['local']));
    // Act
    const env = readEnv({ OLLAMA_ENABLED: '1' });
    const result = await gateway.complete(request);
    // Assert
    expect(env.openRouterApiKey).toBe('');
    expect(result.content).toBe('local');
  });

  it('should_reject_remote_or_cloud_ollama_when_configured', () => {
    // Arrange
    const remote = { OLLAMA_BASE_URL: 'https://ollama.com' };
    // Act
    const configure = () => localConfig(remote);
    // Assert
    expect(configure).toThrow('loopback');
    expect(() => localConfig({ OLLAMA_MODEL: 'gpt-oss:cloud' })).toThrow('forbidden');
  });

  it('should_use_json_and_release_memory_when_local_model_completes', async () => {
    // Arrange
    let body: Record<string, unknown> = {};
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return Response.json({ message: { content: '{"ok":true}' }, prompt_eval_count: 5, eval_count: 4 });
    }) as unknown as typeof fetch;
    const gateway = new OllamaGateway(localConfig({}), fakeFetch);
    // Act
    const result = await gateway.complete(request);
    // Assert
    expect(body).toMatchObject({ model: 'qwen2.5-coder:7b', format: 'json', stream: false, keep_alive: '30s' });
    expect(result.modelUsed).toBe('ollama/qwen2.5-coder:7b');
    expect(result.usage).toEqual({ promptTokens: 5, completionTokens: 4 });
  });

  it('should_reject_partial_json_when_local_reply_is_truncated', async () => {
    // Arrange
    const fakeFetch = (async () => Response.json({ message: { content: '{"partial":' }, done_reason: 'length' })) as typeof fetch;
    const gateway = new OllamaGateway(localConfig({}), fakeFetch);
    // Act
    const result = gateway.complete(request);
    // Assert
    await expect(result).rejects.toMatchObject({ status: 422 });
  });
});
