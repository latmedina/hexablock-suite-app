/**
 * Names a TypeScript module exports, found with regexes (no compiler): `export [default] [declare] [abstract]
 * const|let|var|function|class|interface|type|enum|namespace <name>` and `export { a, b as c }` /
 * `export type { ... }`. Comments are stripped first. Good enough to notice a rewrite that drops an export
 * other files import; `export *` re-exports are ignored.
 */
export function exportedNames(source: string): Set<string> {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const names = new Set<string>();
  const declaration = /\bexport\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of code.matchAll(declaration)) names.add(match[1]!);
  const list = /\bexport\s+(?:type\s+)?\{([^}]*)\}/g;
  for (const match of code.matchAll(list)) {
    for (const part of match[1]!.split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/** Exports present in `before` and missing from `after`, sorted. */
export function removedExports(before: string, after: string): string[] {
  const kept = exportedNames(after);
  return [...exportedNames(before)].filter((name) => !kept.has(name)).sort();
}
