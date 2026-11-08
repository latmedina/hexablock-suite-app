import { describe, expect, it } from 'vitest';
import { ModuleBoundaryError } from '../src/application/pipeline';
import { loadAgentDefinitions } from '../src/config/agents.config';
import { AgentFactory } from '../src/main/agent-factory';
import { InMemoryPrompts, MemoryRunLog, ScriptedLlm, validPatch, validSpec } from './doubles';

function factoryWith(replies: string[]) {
  const llm = new ScriptedLlm(replies);
  const log = new MemoryRunLog();
  const factory = new AgentFactory(loadAgentDefinitions({}), llm, new InMemoryPrompts(), log, { now: () => new Date(0) }, 'run-1');
  return { llm, log, factory };
}

describe('Architect -> Dev pipeline', () => {
  it('should_pass_architect_spec_to_dev_app_when_module_is_in_app_repo', async () => {
    // Arrange
    const { llm, factory } = factoryWith([JSON.stringify(validSpec), JSON.stringify(validPatch())]);
    // Act
    const result = await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(result.patch.output.files[0]?.path).toBe('src/domain/geometry/HexGeometry.ts');
    expect(llm.requests[1]?.messages[0]?.content).toContain('PROMPT:dev-app.md');
    expect(llm.requests[1]?.messages[0]?.content).toContain('RULES:app/domain-core');
    expect(llm.requests[1]?.messages[1]?.content).toContain('"P2-hex-geometry"');
  });

  it('should_route_to_dev_api_when_spec_module_is_in_api_repo', async () => {
    // Arrange
    const apiSpec = { ...validSpec, id: 'P9-progress', module: 'api/application' };
    const { llm, factory } = factoryWith([JSON.stringify(apiSpec), JSON.stringify(validPatch('src/application/SaveProgress.ts'))]);
    // Act
    await factory.architectToDev().run('Save progress per gameId');
    // Assert
    expect(llm.requests[1]?.messages[0]?.content).toContain('PROMPT:dev-api.md');
  });

  it('should_throw_module_boundary_error_when_dev_writes_outside_module', async () => {
    // Arrange
    const { factory } = factoryWith([JSON.stringify(validSpec), JSON.stringify(validPatch('src/domain/variants/hexa-fit/Rules.ts'))]);
    // Act
    const act = factory.architectToDev().run('Implement hex geometry');
    // Assert
    await expect(act).rejects.toBeInstanceOf(ModuleBoundaryError);
  });

  it('should_log_one_record_per_agent_when_pipeline_succeeds', async () => {
    // Arrange
    const { log, factory } = factoryWith([JSON.stringify(validSpec), JSON.stringify(validPatch())]);
    // Act
    await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(log.records.map((r) => r.agentId)).toEqual(['architect', 'dev-app']);
    expect(log.records.every((r) => r.ok && r.runId === 'run-1')).toBe(true);
  });
});
