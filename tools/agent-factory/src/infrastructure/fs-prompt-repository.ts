import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { IPromptRepository } from '../application/ports';
import { MODULES, type ModuleKey, type RepoKey } from '../domain/modules';

/** Reads prompts from `prompts/` and the binding AGENTS.md files from the two repos on disk. */
export class FsPromptRepository implements IPromptRepository {
  constructor(private readonly promptsDir: string, private readonly repoRoots: Record<RepoKey, string>) {}

  async systemPrompt(promptFile: string): Promise<string> {
    if (promptFile.includes('/') || promptFile.includes('..')) throw new Error(`Invalid prompt file: ${promptFile}`);
    return readFile(path.join(this.promptsDir, promptFile), 'utf8');
  }

  async moduleContext(moduleKey: ModuleKey): Promise<string> {
    const mod = MODULES[moduleKey];
    const root = this.repoRoots[mod.repo];
    const files = ['AGENTS.md', ...mod.agentsMd];
    const sections = await Promise.all(
      files.map(async (rel) => {
        try {
          return `### ${mod.repo}:${rel}\n\n${await readFile(path.join(root, rel), 'utf8')}`;
        } catch {
          return `### ${mod.repo}:${rel}\n\n(not found on this branch — ask the owner, do not guess its rules)`;
        }
      }),
    );
    return [`Module: ${moduleKey} | owner: ${mod.owner} | writable paths: ${mod.paths.join(', ')}`, ...sections].join('\n\n');
  }
}
