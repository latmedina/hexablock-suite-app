/**
 * Module map of HexaBlock Suite (mirrors docs/agents/README.md and .github/CODEOWNERS).
 * Agents may only write inside the paths of the module they were given.
 */
export type RepoKey = 'app' | 'api';

export interface ModuleDefinition {
  readonly repo: RepoKey;
  readonly paths: readonly string[];
  /** AGENTS.md files to inject, relative to the repo root (root AGENTS.md is always added). */
  readonly agentsMd: readonly string[];
  readonly owner: string;
}

export const MODULES = {
  'app/domain-core': {
    repo: 'app',
    paths: ['src/domain/geometry/', 'src/domain/board/', 'src/domain/engine/', 'src/domain/commands/',
      'src/domain/capabilities/', 'src/domain/pieces/', 'src/domain/scoring/', 'src/domain/IVariantFactory.ts', 'test/'],
    agentsMd: ['src/domain/AGENTS.md', 'test/AGENTS.md'],
    owner: '@latmedina',
  },
  'app/hexa-lines': { repo: 'app', paths: ['src/domain/variants/hexa-lines/', 'test/'], agentsMd: ['src/domain/variants/AGENTS.md', 'test/AGENTS.md'], owner: '@latmedina' },
  'app/hexa-merge': { repo: 'app', paths: ['src/domain/variants/hexa-merge/', 'test/'], agentsMd: ['src/domain/variants/AGENTS.md', 'test/AGENTS.md'], owner: '@latmedina' },
  'app/hexa-fit': { repo: 'app', paths: ['src/domain/variants/hexa-fit/', 'test/'], agentsMd: ['src/domain/variants/AGENTS.md', 'test/AGENTS.md'], owner: '@Arnoldo182' },
  'app/hexa-sort': { repo: 'app', paths: ['src/domain/variants/hexa-sort/', 'test/'], agentsMd: ['src/domain/variants/AGENTS.md', 'test/AGENTS.md'], owner: '@Arnoldo182' },
  'app/levels': { repo: 'app', paths: ['assets/levels/', 'src/adapters/level-builder/', 'test/'], agentsMd: ['assets/levels/AGENTS.md', 'test/AGENTS.md'], owner: '@Arnoldo182' },
  'app/application': { repo: 'app', paths: ['src/application/', 'test/'], agentsMd: ['src/application/AGENTS.md', 'test/AGENTS.md'], owner: '@latmedina' },
  'app/adapters': { repo: 'app', paths: ['src/adapters/', 'test/'], agentsMd: ['src/adapters/AGENTS.md', 'test/AGENTS.md'], owner: 'shared' },
  'app/ui': { repo: 'app', paths: ['src/ui/', 'test/ui/'], agentsMd: ['src/ui/AGENTS.md', 'test/AGENTS.md'], owner: '@latmedina / @Arnoldo182' },
  'app/infrastructure': { repo: 'app', paths: ['src/infrastructure/', 'test/'], agentsMd: ['src/infrastructure/AGENTS.md', 'test/AGENTS.md'], owner: '@luisloaiza2' },
  'api/domain': { repo: 'api', paths: ['src/domain/', 'test/'], agentsMd: [], owner: '@luisloaiza2' },
  'api/application': { repo: 'api', paths: ['src/application/', 'test/'], agentsMd: [], owner: '@luisloaiza2' },
  'api/adapters': { repo: 'api', paths: ['src/adapters/', 'test/'], agentsMd: [], owner: '@luisloaiza2' },
  'api/infrastructure': { repo: 'api', paths: ['src/infrastructure/', 'prisma/', 'test/'], agentsMd: [], owner: '@luisloaiza2' },
} as const satisfies Record<string, ModuleDefinition>;

export type ModuleKey = keyof typeof MODULES;
export const MODULE_KEYS = Object.keys(MODULES) as [ModuleKey, ...ModuleKey[]];

/** True if `filePath` (repo-relative, POSIX) is inside one of the module paths. Rejects traversal. */
export function isPathInsideModule(moduleKey: ModuleKey, filePath: string): boolean {
  if (filePath.startsWith('/') || filePath.split('/').includes('..')) return false;
  const normalized = filePath.replace(/^\.\//, '');
  return MODULES[moduleKey].paths.some((p) => (p.endsWith('/') ? normalized.startsWith(p) : normalized === p));
}
