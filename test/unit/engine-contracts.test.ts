import type { IGameRules, Resolution } from '../../src/domain/engine/IGameRules';

// Test double: a fake cell/move/state proves the contracts do not depend on any concrete variant.
type FakeCell = 'x';
type FakeMove = { readonly value: number };
type FakeState = { readonly total: number };

class FakeRules implements IGameRules<FakeCell, FakeMove, FakeState> {
  initialState(): FakeState {
    return { total: 0 };
  }
  isValid(_state: FakeState, move: FakeMove): boolean {
    return move.value > 0;
  }
  apply(state: FakeState, move: FakeMove): FakeState {
    return { total: state.total + move.value };
  }
  resolve(state: FakeState): Resolution<FakeState> {
    return { state, events: [] };
  }
  outcome(state: FakeState) {
    return state.total >= 10 ? ('victory' as const) : ('playing' as const);
  }
}

describe('IGameRules contract', () => {
  it('should_report_victory_when_fake_rules_reach_target', () => {
    // Arrange
    const rules = new FakeRules();
    const start = rules.initialState();

    // Act
    const next = rules.apply(start, { value: 10 });

    // Assert
    expect(rules.outcome(next)).toBe('victory');
  });
});
