import type { IBoardShape } from './board/IHexBoard';
import type { IGameRules } from './engine/IGameRules';
import type { IPieceSource } from './pieces/IPieceSource';
import type { IProgressModel } from './scoring/IProgressModel';
import type { IScoringPolicy } from './scoring/IScoringPolicy';

/**
 * Abstract Factory: one per variant (HexaLinesFactory, HexaFitFactory, ...) producing a coherent family.
 * Adding a 5th variant = a new factory + one registration line in src/main. DRAFT (P1).
 */
export interface IVariantFactory<TCell, TMove, TState, TPiece> {
  readonly gameId: string;
  createShape(): IBoardShape;
  createRules(): IGameRules<TCell, TMove, TState>;
  createPieceSource(seed?: number): IPieceSource<TPiece>;
  createScoring(): IScoringPolicy<TState>;
  createProgressModel(): IProgressModel;
}
