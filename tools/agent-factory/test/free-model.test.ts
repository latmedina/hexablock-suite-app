import { describe, expect, it } from 'vitest';
import { loadAgentDefinitions, ALL_CONFIGURED_MODELS } from '../src/config/agents.config';
import { assertFreeModel, isFreeModelId, PaidModelError } from '../src/domain/free-model';

describe('free model guard', () => {
  it('should_accept_model_when_id_has_free_suffix', () => {
    // Arrange
    const id = 'cohere/north-mini-code:free';
    // Act
    const result = isFreeModelId(id);
    // Assert
    expect(result).toBe(true);
  });

  it('should_throw_paid_model_error_when_id_has_no_free_suffix', () => {
    // Arrange
    const id = 'openai/gpt-5';
    // Act
    const act = () => assertFreeModel(id);
    // Assert
    expect(act).toThrow(PaidModelError);
  });

  it('should_only_contain_free_models_when_loading_default_config', () => {
    // Arrange
    const definitions = loadAgentDefinitions({});
    // Act
    const models = Object.values(definitions).flatMap((d) => d.models);
    // Assert
    expect(models.every(isFreeModelId)).toBe(true);
    expect(ALL_CONFIGURED_MODELS.every(isFreeModelId)).toBe(true);
  });

  it('should_reject_override_when_env_points_to_paid_model', () => {
    // Arrange
    const env = { AGENT_DEV_APP_MODELS: 'anthropic/claude-opus' };
    // Act
    const act = () => loadAgentDefinitions(env);
    // Assert
    expect(act).toThrow(PaidModelError);
  });

  it('should_use_override_chain_when_env_sets_free_models', () => {
    // Arrange
    const env = { AGENT_REVIEWER_MODELS: 'google/gemma-4-31b-it:free, recursive/flint-v1.0:free' };
    // Act
    const definitions = loadAgentDefinitions(env);
    // Assert
    expect(definitions.reviewer.models).toEqual(['google/gemma-4-31b-it:free', 'recursive/flint-v1.0:free']);
  });

  it('should_use_different_model_family_when_reviewer_checks_dev_output', () => {
    // Arrange
    const definitions = loadAgentDefinitions({});
    const vendor = (id: string) => id.split('/')[0];
    // Act
    const devVendor = vendor(definitions['dev-app'].models[0] ?? '');
    const reviewerVendor = vendor(definitions.reviewer.models[0] ?? '');
    // Assert
    expect(reviewerVendor).not.toBe(devVendor);
  });
});
