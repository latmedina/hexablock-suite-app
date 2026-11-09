import path from 'node:path';

export interface FactoryEnv {
  readonly openRouterApiKey: string;
  readonly openRouterBaseUrl: string;
  readonly appRepoRoot: string;
  readonly apiRepoRoot: string;
  readonly runsDir: string;
  readonly promptsDir: string;
  readonly timeoutMs: number;
  /** Run tsc/jest/lint on each patch in a temp git worktree and let Dev repair it (VERIFY_PATCHES=0 disables). */
  readonly verifyPatches: boolean;
  readonly maxRepairRounds: number;
  /** Ask the Reviewer agent for a verdict on the final patch (REVIEW_PATCHES=0 disables). */
  readonly reviewPatches: boolean;
  /** No new repair round starts after this long (RUN_BUDGET_MINUTES, default 12). */
  readonly runBudgetMs: number;
}

export function readEnv(env: Readonly<Record<string, string | undefined>> = process.env, cwd = process.cwd()): FactoryEnv {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set. Copy .env.example to .env.local and add your key.');
  return {
    openRouterApiKey: apiKey,
    openRouterBaseUrl: env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    appRepoRoot: path.resolve(cwd, env.APP_REPO_ROOT ?? '../..'),
    apiRepoRoot: path.resolve(cwd, env.API_REPO_ROOT ?? '../../../hexablock-suite-api'),
    runsDir: resolveRunsDir(env, cwd),
    promptsDir: path.resolve(cwd, 'prompts'),
    timeoutMs: Number(env.OPENROUTER_TIMEOUT_MS ?? 180_000),
    verifyPatches: env.VERIFY_PATCHES !== '0',
    maxRepairRounds: Math.max(0, Number(env.MAX_REPAIR_ROUNDS ?? 3)),
    reviewPatches: env.REVIEW_PATCHES !== '0',
    runBudgetMs: Math.max(1, Number(env.RUN_BUDGET_MINUTES ?? 12)) * 60_000,
  };
}

/** Where runs and events are stored. Needs no API key, so the dashboard works before one is set. */
export function resolveRunsDir(env: Readonly<Record<string, string | undefined>> = process.env, cwd = process.cwd()): string {
  return path.resolve(cwd, env.RUNS_DIR ?? '.runs');
}
