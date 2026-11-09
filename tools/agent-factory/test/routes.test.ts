import { describe, expect, it, vi } from 'vitest';
import { POST as runAgent } from '../app/api/agents/[id]/route';

vi.mock('../src/main/agent-factory', () => ({
  AgentFactory: { fromEnv: () => { throw new Error('factory must not be built'); } },
}));

const call = (id: string) =>
  runAgent(new Request(`http://x/api/agents/${id}`, { method: 'POST', body: JSON.stringify({ prompt: 'x' }) }), {
    params: Promise.resolve({ id }),
  });

describe('POST /api/agents/[id]', () => {
  it('should_refuse_dev_app_when_called_outside_the_pipeline', async () => {
    // Arrange
    const id = 'dev-app';
    // Act
    const res = await call(id);
    // Assert
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe('UsePipeline');
  });

  it('should_refuse_dev_api_when_called_outside_the_pipeline', async () => {
    // Arrange
    const id = 'dev-api';
    // Act
    const res = await call(id);
    // Assert
    expect(res.status).toBe(409);
  });
});
