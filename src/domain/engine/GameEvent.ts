/** Domain events published by the engine (Observer pattern). DRAFT (P1). */
export type GameEvent =
  | { readonly type: 'MoveApplied' }
  | { readonly type: 'LineCleared'; readonly lines: number }
  | { readonly type: 'StackMerged'; readonly color: string; readonly size: number }
  | { readonly type: 'TileMerged'; readonly value: number }
  | { readonly type: 'ScoreChanged'; readonly score: number }
  | { readonly type: 'GameOver' }
  | { readonly type: 'Victory' };

export interface IGameObserver {
  onEvent(event: GameEvent): void;
}
