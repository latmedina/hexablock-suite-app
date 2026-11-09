import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../app/api/power/route';
import { drainRuns, finishRun, powerState, registerRun } from '../src/infrastructure/run-registry';

const reset = () => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for('hexablock.agent-factory.draining')];
  delete (globalThis as Record<symbol, unknown>)[Symbol.for('hexablock.agent-factory.run-registry')];
};

beforeEach(() => { reset(); vi.stubEnv('FACTORY_MANAGED', '1'); vi.stubEnv('OLLAMA_ENABLED', '0'); });
afterEach(() => { reset(); vi.unstubAllEnvs(); });

describe('factory power control', () => {
  it('should_preserve_existing_runs_and_reject_new_runs_when_draining', () => {
    // Arrange
    const controller = registerRun('existing');
    // Act
    drainRuns();
    // Assert
    expect(controller.signal.aborted).toBe(false);
    expect(powerState()).toEqual({ draining: true, activeRuns: 1 });
    expect(() => registerRun('new')).toThrow('shutting down');
    finishRun('existing');
    expect(powerState()).toEqual({ draining: true, activeRuns: 0 });
  });

  it('should_reject_shutdown_when_token_is_missing', async () => {
    // Arrange
    vi.stubEnv('FACTORY_TOKEN', 'test-only-token');
    // Act
    const response = await POST(new Request('http://localhost/api/power', { method: 'POST' }));
    // Assert
    expect(response.status).toBe(401);
    expect(powerState().draining).toBe(false);
  });

  it('should_report_and_drain_when_authorized', async () => {
    // Arrange
    vi.stubEnv('FACTORY_TOKEN', 'test-only-token');
    const headers = { Authorization: 'Bearer test-only-token' };
    registerRun('existing');
    // Act
    const before = await GET(new Request('http://localhost/api/power', { headers }));
    const after = await POST(new Request('http://localhost/api/power', { method: 'POST', headers }));
    // Assert
    expect(await before.json()).toMatchObject({ draining: false, activeRuns: 1 });
    expect(await after.json()).toMatchObject({ draining: true, activeRuns: 1 });
  });
});
