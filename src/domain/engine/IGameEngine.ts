import type { IGameObserver } from './GameEvent';
import type { GameOutcome } from './IGameRules';

/**
 * Generic turn orchestrator: init → receive move → validate → apply → resolve → evaluate → notify.
 * Independent of the variant and of the UI framework. DRAFT (P1).
 */
export interface IGameEngine<TMove, TState> {
  readonly state: TState;
  readonly outcome: GameOutcome;
  start(): void;
  play(move: TMove): boolean;
  subscribe(observer: IGameObserver): () => void;
}
