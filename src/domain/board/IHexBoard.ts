import type { HexAxis, HexCoord, HexDirection } from '../geometry/HexCoord';

/** Shape of a board: which coordinates exist (hexagon of radius N or an arbitrary figure). */
export interface IBoardShape {
  contains(coord: HexCoord): boolean;
  coords(): Iterable<HexCoord>;
}

/**
 * Generic hexagonal board, written once and reused by every variant.
 * TCell = Color (Lines) | PieceId (Fit) | ColorStack (Sort) | number (Merge).
 * DRAFT (P1).
 */
export interface IHexBoard<TCell> {
  readonly shape: IBoardShape;
  get(coord: HexCoord): TCell | undefined;
  /** Returns a new board (immutable updates make undo and Prototype cheap). */
  with(coord: HexCoord, cell: TCell | undefined): IHexBoard<TCell>;
  isEmpty(coord: HexCoord): boolean;
  neighbours(coord: HexCoord): Iterable<HexCoord>;
  /** Iterator pattern: walk without exposing the internal representation. */
  line(axis: HexAxis, index: number): Iterable<HexCoord>;
  ray(from: HexCoord, direction: HexDirection): Iterable<HexCoord>;
  ring(center: HexCoord, radius: number): Iterable<HexCoord>;
  clone(): IHexBoard<TCell>;
}
