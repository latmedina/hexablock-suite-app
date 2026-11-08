import path from 'node:path';

export interface FactoryEnv {
  readonly openRouterApiKey: string;
  readonly openRouterBaseUrl: string;
  readonly appRepoRoot: string;
  readonly apiRepoRoot: string;
  readonly runsDir: string;
  readonly promptsDir: string;
  readonly timeoutMs: number;
}

export function readEnv(env: Readonly<Record<string, string | undefined>> = process.env, cwd = process.cwd()): FactoryEnv {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set. Copy .env.example to .env.local and add your key.');
  return {
    openRouterApiKey: apiKey,
    openRouterBaseUrl: env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    appRepoRoot: path.resolve(cwd, env.APP_REPO_ROOT ?? '../..'),
    apiRepoRoot: path.resolve(cwd, env.API_REPO_ROOT ?? '../../../hexablock-suite-api'),
    runsDir: path.resolve(cwd, env.RUNS_DIR ?? '.runs'),
    promptsDir: path.resolve(cwd, 'prompts'),
    timeoutMs: Number(env.OPENROUTER_TIMEOUT_MS ?? 180_000),
  };
}
