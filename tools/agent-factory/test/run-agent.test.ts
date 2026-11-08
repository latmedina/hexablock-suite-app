import { describe, expect, it } from 'vitest';
import { RunAgent, AgentOutputError } from '../src/application/run-agent';
import { loadAgentDefinitions } from '../src/config/agents.config';
import { InMemoryPrompts, ScriptedLlm, validSpec } from './doubles';

const architect = loadAgentDefinitions({}).architect;

describe('RunAgent', () => {
  it('should_return_validated_output_when_model_replies_with_fenced_json', async () => {
    // Arrange
    const llm = new ScriptedLlm(['Here you go:\n```json\n' + JSON.stringify(validSpec) + '\n```']);
    const agent = new RunAgent(architect, llm, new InMemoryPrompts());
    // Act
    const result = await agent.execute({ userPrompt: 'design P2' });
    // Assert
    expect(result.output.id).toBe('P2-hex-geometry');
    expect(result.attempts).toBe(1);
  });

  it('should_send_repair_turn_when_first_reply_breaks_contract', async () => {
    // Arrange
    const bad = { ...validSpec, acceptanceTests: ['test distance'] };
    const llm = new ScriptedLlm([JSON.stringify(bad), JSON.stringify(validSpec)]);
    const agent = new RunAgent(architect, llm, new InMemoryPrompts());
    // Act
    const result = await agent.execute({ userPrompt: 'design P2' });
    // Assert
    expect(result.attempts).toBe(2);
    expect(llm.requests[1]?.messages.at(-1)?.content).toContain('INVALID');
  });

  it('should_throw_agent_output_error_when_repair_also_fails', async () => {
    // Arrange
    const llm = new ScriptedLlm(['not json', 'still not json']);
    const agent = new RunAgent(architect, llm, new InMemoryPrompts());
    // Act
    const act = agent.execute({ userPrompt: 'design P2' });
    // Assert
    await expect(act).rejects.toBeInstanceOf(AgentOutputError);
  });

  it('should_append_output_schema_to_system_prompt_when_building_messages', async () => {
    // Arrange
    const llm = new ScriptedLlm([JSON.stringify(validSpec)]);
    const agent = new RunAgent(architect, llm, new InMemoryPrompts());
    // Act
    await agent.execute({ userPrompt: 'design P2' });
    // Assert
    const system = llm.requests[0]?.messages[0]?.content ?? '';
    expect(system).toContain('PROMPT:architect.md');
    expect(system).toContain('acceptanceTests');
  });
});

describe('extractJson', () => {
  it('should_parse_reply_when_string_contains_raw_newlines', async () => {
    // Arrange
    const { extractJson } = await import('../src/application/json-output');
    const raw = '{"files":[{"path":"a.ts","content":"line1\nline2\tend"}]}';
    // Act
    const json = extractJson(raw) as { files: Array<{ content: string }> };
    // Assert
    expect(json.files[0]?.content).toBe('line1\nline2\tend');
  });

  it('should_parse_object_when_content_contains_inner_code_fences', async () => {
    // Arrange
    const { extractJson } = await import('../src/application/json-output');
    const raw = '{"content":"```ts\\nconst a = 1;\\n```"}';
    // Act
    const json = extractJson(raw) as { content: string };
    // Assert
    expect(json.content).toContain('const a = 1;');
  });
});
