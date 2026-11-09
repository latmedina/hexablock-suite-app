import { describe, expect, it } from 'vitest';
import { importCandidates, relativeImports } from '../src/application/imports';

describe('relativeImports', () => {
  it('should_resolve_relative_paths_when_file_imports_siblings_and_parents', () => {
    // Arrange
    const source = [
      "import type { IBoardShape } from './IBoardShape';",
      "import { HexCoord } from '../geometry/HexCoord';",
      "export { x } from './x.js';",
      "import { z } from 'zod';",
    ].join('\n');
    // Act
    const imports = relativeImports('src/domain/board/HexBoard.ts', source);
    // Assert
    expect(imports).toEqual(['src/domain/board/IBoardShape', 'src/domain/geometry/HexCoord', 'src/domain/board/x']);
  });

  it('should_list_ts_tsx_and_index_when_building_candidates', () => {
    // Arrange
    const base = 'src/domain/board';
    // Act
    const candidates = importCandidates(base);
    // Assert
    expect(candidates).toEqual(['src/domain/board.ts', 'src/domain/board.tsx', 'src/domain/board/index.ts']);
  });
});
