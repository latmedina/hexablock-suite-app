/**
 * Runs in progress in this process, so the dashboard can cancel one. Stored on globalThis so Next.js dev
 * reloads keep a single registry.
 */
const KEY = Symbol.for('hexablock.agent-factory.run-registry');

function registry(): Map<string, AbortController> {
  const holder = globalThis as unknown as Record<symbol, Map<string, AbortController> | undefined>;
  holder[KEY] ??= new Map();
  return holder[KEY];
}

export function registerRun(runId: string): AbortController {
  const controller = new AbortController();
  registry().set(runId, controller);
  return controller;
}

export function finishRun(runId: string): void {
  registry().delete(runId);
}

/** true if the run was running here and is now cancelled. */
export function cancelRun(runId: string): boolean {
  const controller = registry().get(runId);
  if (!controller) return false;
  controller.abort();
  return true;
}
