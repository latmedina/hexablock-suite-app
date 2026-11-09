import { describe, expect, it } from 'vitest';
import type { FactoryEvent, IPatchVerifier, PatchFile, VerifyReport } from '../src/application/ports';
import { loadAgentDefinitions } from '../src/config/agents.config';
import { AgentFactory, type FactoryExtras } from '../src/main/agent-factory';
import { InMemoryPrompts, InMemoryRepoFiles, MemoryRunLog, ScriptedLlm, validPatch, validSpec } from './doubles';

class ScriptedVerifier implements IPatchVerifier {
  readonly seen: PatchFile[][] = [];
  constructor(private readonly reports: VerifyReport[]) {}
  async verify(_repo: 'app' | 'api', files: readonly PatchFile[]) {
    this.seen.push([...files]);
    return this.reports.shift() ?? { ok: true, checks: [] };
  }
}

const failed: VerifyReport = { ok: false, checks: [{ name: 'typecheck', ok: false, output: "HexGeometry.ts(3,1): error TS2304: Cannot find name 'HexCoord'.", durationMs: 5 }] };
const passed: VerifyReport = { ok: true, checks: [{ name: 'typecheck', ok: true, output: '', durationMs: 5 }] };
const review = { verdict: 'approve', findings: [], summary: 'Looks right.' };

function setup(replies: string[], extras: FactoryExtras) {
  const llm = new ScriptedLlm(replies);
  const events: FactoryEvent[] = [];
  const factory = new AgentFactory(loadAgentDefinitions({}), llm, new InMemoryPrompts(), new MemoryRunLog(), new InMemoryRepoFiles(), { now: () => new Date(0) }, 'run-1', {
    ...extras,
    events: { publish: (e) => events.push(e) },
  });
  return { llm, events, factory };
}

describe('Pipeline verification and repair', () => {
  it('should_send_check_errors_back_to_dev_when_first_patch_fails_verification', async () => {
    // Arrange
    const verifier = new ScriptedVerifier([failed, passed]);
    const { llm, factory } = setup([JSON.stringify(validSpec), JSON.stringify(validPatch()), JSON.stringify(validPatch())], { verifier });
    // Act
    const result = await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(result.repairRounds).toBe(1);
    expect(result.verification?.ok).toBe(true);
    expect(llm.requests[2]?.messages[1]?.content).toContain("Cannot find name 'HexCoord'");
    expect(llm.requests[2]?.messages[1]?.content).toContain('FULL corrected patch');
  });

  it('should_return_failed_verification_when_repair_rounds_run_out', async () => {
    // Arrange
    const verifier = new ScriptedVerifier([failed, failed]);
    const { factory } = setup([JSON.stringify(validSpec), JSON.stringify(validPatch()), JSON.stringify(validPatch())], { verifier, maxRepairRounds: 1 });
    // Act
    const result = await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(result.repairRounds).toBe(1);
    expect(result.verification?.ok).toBe(false);
    expect(verifier.seen).toHaveLength(2);
  });

  it('should_attach_reviewer_verdict_when_review_is_enabled', async () => {
    // Arrange
    const { llm, factory } = setup([JSON.stringify(validSpec), JSON.stringify(validPatch()), JSON.stringify(review)], { verifier: new ScriptedVerifier([passed]), review: true });
    // Act
    const result = await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(result.review?.output.verdict).toBe('approve');
    expect(llm.requests[2]?.messages[0]?.content).toContain('PROMPT:reviewer.md');
    expect(llm.requests[2]?.messages[1]?.content).toContain('typecheck: passed');
  });

  it('should_keep_the_patch_when_reviewer_fails', async () => {
    // Arrange
    const { factory } = setup([JSON.stringify(validSpec), JSON.stringify(validPatch()), 'not json', 'still not json'], { review: true });
    // Act
    const result = await factory.architectToDev().run('Implement hex geometry');
    // Assert
    expect(result.patch.output.files).toHaveLength(1);
    expect(result.reviewError).toMatch(/AgentOutputError/);
  });

  it('should_emit_ordered_step_events_when_run_repairs_once', async () => {
    // Arrange
    const verifier = new ScriptedVerifier([failed, passed]);
    const { events, factory } = setup([JSON.stringify(validSpec), JSON.stringify(validPatch()), JSON.stringify(validPatch())], { verifier });
    // Act
    await factory.architectToDev().run('Implement hex geometry', 'n8n');
    // Assert
    const steps = events.filter((e) => e.type === 'step.finished').map((e) => (e.type === 'step.finished' ? `${e.step}#${e.round}:${e.ok}` : ''));
    expect(steps).toEqual(['architect#0:true', 'dev#0:true', 'verify#0:false', 'dev#1:true', 'verify#1:true']);
    expect(events[0]).toMatchObject({ type: 'run.started', runId: 'run-1', source: 'n8n' });
    expect(events.at(-1)).toMatchObject({ type: 'run.finished', ok: true, verified: true });
    expect(events.some((e) => e.type === 'step.attempt' && e.step === 'dev' && e.ok)).toBe(true);
  });

  it('should_emit_failed_run_event_when_architect_cannot_answer', async () => {
    // Arrange
    const { events, factory } = setup(['nope', 'nope again'], {});
    // Act
    const act = factory.architectToDev().run('Implement hex geometry');
    // Assert
    await expect(act).rejects.toThrow();
    expect(events.at(-1)).toMatchObject({ type: 'run.finished', ok: false });
  });
});
