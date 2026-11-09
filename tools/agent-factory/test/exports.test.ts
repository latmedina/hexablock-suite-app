import { describe, expect, it } from 'vitest';
import { exportedNames, removedExports } from '../src/domain/exports';

describe('exportedNames', () => {
  it('should_find_declarations_and_export_lists_when_module_mixes_both', () => {
    // Arrange
    const source = [
      'export type HexAxis = "q" | "r" | "s";',
      'export interface HexCoord { q: number }',
      'export const ORIGIN = { q: 0 };',
      'export function add() {}',
      'export abstract class Board {}',
      'const a = 1; const b = 2;',
      'export { a, b as Bee };',
      'export type { HexCoord as Coord } from "./x";',
      '// export const Commented = 1;',
    ].join('\n');
    // Act
    const names = exportedNames(source);
    // Assert
    expect([...names].sort()).toEqual(['Bee', 'Board', 'Coord', 'HexAxis', 'HexCoord', 'ORIGIN', 'a', 'add']);
  });
});

describe('removedExports', () => {
  it('should_list_dropped_export_when_rewrite_removes_it', () => {
    // Arrange
    const before = 'export type HexAxis = "q";\nexport type HexDirection = 0 | 1;\nexport interface HexCoord { q: number }';
    const after = 'export type HexAxis = "q";\nexport interface HexCoord { q: number; r: number }';
    // Act
    const removed = removedExports(before, after);
    // Assert
    expect(removed).toEqual(['HexDirection']);
  });

  it('should_return_nothing_when_rewrite_keeps_every_export', () => {
    // Arrange
    const before = 'export type HexAxis = "q";';
    const after = 'export type HexAxis = "q" | "r";\nexport const extra = 1;';
    // Act
    const removed = removedExports(before, after);
    // Assert
    expect(removed).toEqual([]);
  });
});
