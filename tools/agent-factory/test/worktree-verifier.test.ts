import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorktreeVerifier } from '../src/infrastructure/worktree-verifier';

/** A throwaway git repo whose only check fails when src/bad.ts exists. */
function makeRepo(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'verify-repo-'));
  const pkg = { name: 'tmp', private: true, scripts: { typecheck: "node -e \"process.exit(require('fs').existsSync('src/bad.ts') ? 1 : 0)\"" } };
  writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
  return root;
}

const commands = { app: [{ name: 'typecheck', script: 'typecheck' }, { name: 'missing', script: 'not-a-script' }], api: [] };

describe('WorktreeVerifier', () => {
  it('should_pass_when_patch_keeps_checks_green', async () => {
    // Arrange
    const root = makeRepo();
    const verifier = new WorktreeVerifier({ app: root, api: root }, commands, 30_000);
    // Act
    const report = await verifier.verify('app', [{ path: 'src/good.ts', action: 'create', content: 'export const a = 1;' }]);
    // Assert
    expect(report.ok).toBe(true);
    expect(report.checks.map((c) => c.name)).toEqual(['typecheck']);
    expect(existsSync(path.join(root, 'src/good.ts'))).toBe(false);
  });

  it('should_fail_when_patch_breaks_a_check', async () => {
    // Arrange
    const root = makeRepo();
    const verifier = new WorktreeVerifier({ app: root, api: root }, commands, 30_000);
    // Act
    const report = await verifier.verify('app', [{ path: 'src/bad.ts', action: 'create', content: 'oops' }]);
    // Assert
    expect(report.ok).toBe(false);
    expect(report.checks[0]).toMatchObject({ name: 'typecheck', ok: false });
    expect(execFileSync('git', ['worktree', 'list'], { cwd: root }).toString().trim().split('\n')).toHaveLength(1);
  });

  it('should_refuse_patch_when_path_escapes_the_repo', async () => {
    // Arrange
    const root = makeRepo();
    const verifier = new WorktreeVerifier({ app: root, api: root }, commands, 30_000);
    // Act
    const report = await verifier.verify('app', [{ path: '../escape.ts', action: 'create', content: 'x' }]);
    // Assert
    expect(report.ok).toBe(false);
    expect(report.checks[0]?.output).toMatch(/escapes/);
  });
});
