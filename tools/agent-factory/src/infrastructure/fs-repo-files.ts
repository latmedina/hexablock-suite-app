import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { IRepoFiles } from '../application/ports';
import type { RepoKey } from '../domain/modules';

const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'coverage', '.runs']);

/** Read-only view of the two repos on disk. Paths are repo-relative and never escape the repo root. */
export class FsRepoFiles implements IRepoFiles {
  constructor(private readonly roots: Record<RepoKey, string>) {}

  async exists(repo: RepoKey, rel: string): Promise<boolean> {
    const full = this.resolve(repo, rel);
    return full ? stat(full).then((s) => s.isFile(), () => false) : false;
  }

  async read(repo: RepoKey, rel: string): Promise<string | undefined> {
    const full = this.resolve(repo, rel);
    return full ? readFile(full, 'utf8').catch(() => undefined) : undefined;
  }

  async list(repo: RepoKey, folders: readonly string[], limit = 500): Promise<string[]> {
    const root = this.roots[repo];
    const found = new Set<string>();
    const walk = async (rel: string): Promise<void> => {
      if (found.size >= limit) return;
      const entries = await readdir(path.join(root, rel), { withFileTypes: true }).catch(() => []);
      for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (SKIP.has(e.name) || found.size >= limit) continue;
        const child = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) await walk(child);
        else if (e.isFile()) found.add(child);
      }
    };
    for (const folder of folders) {
      if (folder.endsWith('/')) await walk(folder.slice(0, -1));
      else if (await this.exists(repo, folder)) found.add(folder);
    }
    return [...found].sort();
  }

  private resolve(repo: RepoKey, rel: string): string | undefined {
    if (rel.startsWith('/') || rel.split('/').includes('..')) return undefined;
    return path.join(this.roots[repo], rel);
  }
}
