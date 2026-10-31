import type { GameEvent } from '../engine/GameEvent';

/** Interchangeable scoring policy, decoratable (e.g. BonusMultiplierDecorator). DRAFT (P1). */
export interface IScoringPolicy<TState> {
  score(previous: TState, next: TState, events: readonly GameEvent[]): number;
}
