import { describe, expect, it } from 'vitest';
import { describeFailures } from '../src/application/check-failures';

const files = [{ path: 'src/domain/geometry/HexGeometry.ts', action: 'create' as const, content: ['export class HexGeometry {', '  neighbours(c: HexCoord) {', '    const d = DIRS[i];', '    return add(c, d);', '  }', '}'].join('\n') }];

describe('describeFailures', () => {
  it('should_show_type_error_with_offending_line_when_tsc_fails', () => {
    // Arrange
    const report = { ok: false, checks: [{ name: 'typecheck', ok: false, durationMs: 1, output: "> tsc --noEmit\n\nsrc/domain/geometry/HexGeometry.ts(4,19): error TS2345: Argument of type 'HexCoord | undefined' is not assignable to parameter of type 'HexCoord'." }] };
    // Act
    const text = describeFailures(report, files);
    // Assert
    expect(text).toContain('src/domain/geometry/HexGeometry.ts:4:19 TS2345');
    expect(text).toContain('>    4 |     return add(c, d);');
  });

  it('should_keep_each_failing_test_block_when_jest_fails', () => {
    // Arrange
    const output = 'PASS test/a.test.ts\nFAIL test/b.test.ts\n  ● rotate › should_rotate_when_east\n\n    expect(received).toEqual(expected)\n    - 0\n    + -0\n\n  ● rotate › should_wrap_when_six\n\n    boom\n\nTests: 2 failed';
    const report = { ok: false, checks: [{ name: 'test', ok: false, durationMs: 1, output }, { name: 'lint:arch', ok: true, durationMs: 1, output: '' }] };
    // Act
    const text = describeFailures(report, files);
    // Assert
    expect(text).toContain('### test');
    expect(text).toContain('should_rotate_when_east');
    expect(text).toContain('+ -0');
    expect(text).toContain('should_wrap_when_six');
    expect(text).not.toContain('lint:arch');
  });
});
