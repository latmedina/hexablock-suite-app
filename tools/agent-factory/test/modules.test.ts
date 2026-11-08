import { describe, expect, it } from 'vitest';
import { isPathInsideModule } from '../src/domain/modules';

describe('module boundary', () => {
  it('should_allow_path_when_it_is_inside_module_folder', () => {
    // Arrange
    const path = 'src/domain/variants/hexa-fit/HexaFitRules.ts';
    // Act
    const inside = isPathInsideModule('app/hexa-fit', path);
    // Assert
    expect(inside).toBe(true);
  });

  it('should_reject_path_when_it_belongs_to_another_variant', () => {
    // Arrange
    const path = 'src/domain/variants/hexa-sort/HexaSortRules.ts';
    // Act
    const inside = isPathInsideModule('app/hexa-fit', path);
    // Assert
    expect(inside).toBe(false);
  });

  it('should_reject_path_when_it_uses_parent_traversal', () => {
    // Arrange
    const path = 'src/domain/variants/hexa-fit/../../engine/Engine.ts';
    // Act
    const inside = isPathInsideModule('app/hexa-fit', path);
    // Assert
    expect(inside).toBe(false);
  });
});
