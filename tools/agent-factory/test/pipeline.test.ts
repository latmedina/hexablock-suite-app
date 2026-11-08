import { describe, expect, it } from 'vitest';
import { loadAgentDefinitions } from '../src/config/agents.config';
import { AgentFactory } from '../src/main/agent-factory';
import { InMemoryPrompts, InMemoryRepoFiles, MemoryRunLog, ScriptedLlm, validPatch, validSpec } from './doubles';

function factoryWith(replies: string[], files: Record<string, string> = {}) {
  const llm = new ScriptedLlm(replies);
  const log = new MemoryRunLog();
  const factory = new AgentFactory(loadAgentDefinitions({}), llm, new InMemoryPrompts(), log, new InMemoryRepoFiles(files), { now: () => new Date(0) }, 'run-1');
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

  it('should_fail_with_boundary_issue_when_dev_writes_outside_module_twice', async () => {
    // Arrange
    const outside = JSON.stringify(validPatch('src/domain/variants/hexa-fit/Rules.ts'));
    const { factory } = factoryWith([JSON.stringify(validSpec), outside, outside]);
    // Act
    const act = factory.architectToDev().run('Implement hex geometry');
    // Assert
    await expect(act).rejects.toThrow(/outside module app\/domain-core/);
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

  it('should_send_repair_turn_when_dev_replaces_existing_file_not_marked_to_modify', async () => {
    // Arrange
    const files = { 'app:src/domain/geometry/HexCoord.ts': 'export type HexAxis = "q" | "r" | "s";' };
    const overwrite = JSON.stringify(validPatch('src/domain/geometry/HexCoord.ts'));
    const { llm, factory } = factoryWith([JSON.stringify(validSpec), overwrite, JSON.stringify(validPatch())], files);
    // Act
    const result = await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(result.patch.attempts).toBe(2);
    expect(llm.requests[2]?.messages.at(-1)?.content).toContain('already exist');
  });

  it('should_throw_unapproved_overwrite_error_when_dev_keeps_replacing_existing_file', async () => {
    // Arrange
    const files = { 'app:src/domain/geometry/HexCoord.ts': 'export type HexAxis = "q";' };
    const overwrite = JSON.stringify(validPatch('src/domain/geometry/HexCoord.ts'));
    const { factory } = factoryWith([JSON.stringify(validSpec), overwrite, overwrite], files);
    // Act
    const act = factory.architectToDev().run('Implement hex geometry');
    // Assert
    await expect(act).rejects.toThrow(/did not mark "to_modify"|outside module|already exist/);
  });

  it('should_allow_replacing_existing_file_when_spec_marks_it_to_modify', async () => {
    // Arrange
    const files = { 'app:src/domain/geometry/HexCoord.ts': 'export type HexAxis = "q";' };
    const spec = { ...validSpec, interfaces: [{ ...validSpec.interfaces[0], file: 'src/domain/geometry/HexCoord.ts', status: 'to_modify' }] };
    const { factory } = factoryWith([JSON.stringify(spec), JSON.stringify(validPatch('src/domain/geometry/HexCoord.ts'))], files);
    // Act
    const result = await factory.architectToDev().run('Change HexCoord');
    // Assert
    expect(result.patch.attempts).toBe(1);
  });

  it('should_give_architect_file_tree_and_dev_current_file_content_when_files_exist', async () => {
    // Arrange
    const files = { 'app:src/domain/geometry/HexCoord.ts': 'export type HexAxis = "q" | "r" | "s";' };
    const spec = { ...validSpec, interfaces: [...validSpec.interfaces, { file: 'src/domain/geometry/HexCoord.ts', name: 'HexCoord', kind: 'type', status: 'exists', signature: 'type HexCoord' }] };
    const { llm, factory } = factoryWith([JSON.stringify(spec), JSON.stringify(validPatch())], files);
    // Act
    await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(llm.requests[0]?.messages[1]?.content).toContain('app:src/domain/geometry/HexCoord.ts');
    expect(llm.requests[1]?.messages[1]?.content).toContain('export type HexAxis');
  });
});
