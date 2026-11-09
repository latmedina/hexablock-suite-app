/**
 * Relative imports of a TypeScript file, resolved to repository paths without extension
 * (`src/domain/board/IBoardShape`). Package imports are ignored.
 */
export function relativeImports(fromPath: string, source: string): string[] {
  const dir = fromPath.split('/').slice(0, -1);
  const found = new Set<string>();
  const pattern = /(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    const spec = match[1] ?? match[2];
    if (spec === undefined) continue;
    const parts = [...dir];
    for (const segment of spec.split('/')) {
      if (segment === '.' || segment === '') continue;
      if (segment === '..') parts.pop();
      else parts.push(segment);
    }
    found.add(parts.join('/').replace(/\.(ts|tsx|js)$/, ''));
  }
  return [...found];
}

/** File names a resolved import can point to, in the order TypeScript tries them. */
export function importCandidates(base: string): string[] {
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
}
