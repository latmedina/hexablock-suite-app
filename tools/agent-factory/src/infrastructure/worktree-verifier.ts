import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IPatchVerifier, PatchFile, VerifyCheck, VerifyReport } from '../application/ports';
import type { RepoKey } from '../domain/modules';

/** One check: an npm script of the target repo, plus extra args. Skipped when the repo has no such script. */
export interface VerifyCommand {
  readonly name: string;
  readonly script: string;
  readonly args?: readonly string[];
}

/** Checks per repo, cheapest first. Every one runs (no early exit) so Dev sees all errors in one round. */
export const DEFAULT_VERIFY_COMMANDS: Record<RepoKey, readonly VerifyCommand[]> = {
  app: [
    { name: 'typecheck', script: 'typecheck' },
    { name: 'lint:tests', script: 'lint:tests' },
    { name: 'lint:arch', script: 'lint:arch' },
    { name: 'test', script: 'test', args: ['--ci', '--silent'] },
  ],
  api: [
    { name: 'typecheck', script: 'typecheck' },
    { name: 'test:unit', script: 'test:unit', args: ['--ci', '--silent'] },
  ],
};

const MAX_OUTPUT_CHARS = 8_000;
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

/**
 * Verification step. Creates a detached `git worktree` of the repo at HEAD in a temp folder, links the repo's
 * node_modules into it, writes the patch, runs the repo's own npm scripts and removes the worktree. The real
 * working copy is never touched. The patch's tests DO run (that is the point), so only use it on your machine.
 */
export class WorktreeVerifier implements IPatchVerifier {
  constructor(
    private readonly roots: Record<RepoKey, string>,
    private readonly commands: Record<RepoKey, readonly VerifyCommand[]> = DEFAULT_VERIFY_COMMANDS,
    private readonly timeoutMs = 240_000,
  ) {}

  async verify(repo: RepoKey, files: readonly PatchFile[], signal?: AbortSignal): Promise<VerifyReport> {
    const root = this.roots[repo];
    const dir = await mkdtemp(path.join(tmpdir(), `hexablock-verify-${repo}-`));
    const added = await run('git', ['-C', root, 'worktree', 'add', '--detach', '--force', dir, 'HEAD'], root, 60_000);
    if (!added.ok) {
      await rm(dir, { recursive: true, force: true });
      return { ok: false, checks: [{ name: 'setup', ok: false, output: added.output, durationMs: added.durationMs }] };
    }
    try {
      if (existsSync(path.join(root, 'node_modules'))) await symlink(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
      for (const file of files) {
        const target = path.resolve(dir, file.path);
        if (!target.startsWith(dir + path.sep)) throw new Error(`Patch path escapes the repository: ${file.path}`);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, file.content, 'utf8');
      }
      const scripts = await readScripts(dir);
      const checks: VerifyCheck[] = [];
      for (const command of this.commands[repo]) {
        if (signal?.aborted) break;
        if (!scripts.has(command.script)) continue;
        const args = ['run', command.script, ...(command.args?.length ? ['--', ...command.args] : [])];
        const result = await run('npm', args, dir, this.timeoutMs, signal);
        checks.push({ name: command.name, ok: result.ok, output: result.output, durationMs: result.durationMs });
      }
      return { ok: checks.every((c) => c.ok), checks };
    } catch (error) {
      return { ok: false, checks: [{ name: 'setup', ok: false, output: (error as Error).message, durationMs: 0 }] };
    } finally {
      await run('git', ['-C', root, 'worktree', 'remove', '--force', dir], root, 60_000);
      await rm(dir, { recursive: true, force: true });
    }
  }
}

async function readScripts(dir: string): Promise<Set<string>> {
  try {
    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
    return new Set(Object.keys(pkg.scripts ?? {}));
  } catch {
    return new Set();
  }
}

interface RunResult {
  readonly ok: boolean;
  readonly output: string;
  readonly durationMs: number;
}

function run(cmd: string, args: readonly string[], cwd: string, timeoutMs: number, signal?: AbortSignal): Promise<RunResult> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let output = '';
    let settled = false;
    const child = spawn(cmd, args, { cwd, env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const collect = (chunk: Buffer) => {
      output = (output + chunk.toString('utf8')).slice(-MAX_OUTPUT_CHARS * 4);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = setTimeout(() => {
      output += `\n[timed out after ${Math.round(timeoutMs / 1000)} s]`;
      child.kill('SIGKILL');
    }, timeoutMs);
    const onAbort = () => {
      output += '\n[cancelled]';
      child.kill('SIGKILL');
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      const clean = output.replace(ANSI, '').trim();
      resolve({ ok, output: clean.length > MAX_OUTPUT_CHARS ? `…${clean.slice(-MAX_OUTPUT_CHARS)}` : clean, durationMs: Date.now() - startedAt });
    };
    child.on('error', (error) => {
      output += `\n${error.message}`;
      done(false);
    });
    child.on('close', (code) => done(code === 0));
  });
}
