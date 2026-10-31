import type { GameEvent } from './GameEvent';

export type GameOutcome = 'playing' | 'victory' | 'defeat';

/** Result of the resolution rule: the new state plus the events it produced. */
export interface Resolution<TState> {
  readonly state: TState;
  readonly events: readonly GameEvent[];
}

/**
 * Contract implemented by every variant (Strategy pattern).
 * The engine must never branch on the concrete variant (LSP).
 * DRAFT (P1).
 */
export interface IGameRules<TCell, TMove, TState> {
  initialState(): TState;
  isValid(state: TState, move: TMove): boolean;
  apply(state: TState, move: TMove): TState;
  /** Lines (Lines), coverage check (Fit), cascade (Sort), merge (Merge). */
  resolve(state: TState): Resolution<TState>;
  outcome(state: TState): GameOutcome;
}
