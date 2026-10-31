/**
 * Axial hex coordinate (q, r). The third cube coordinate is s = -q - r.
 * Reference: https://www.redblobgames.com/grids/hexagons/
 * DRAFT (P1): to be agreed by the whole team before implementation.
 */
export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

/** The 6 neighbour directions of a pointy/flat hex grid, in clockwise order. */
export type HexDirection = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE';

/** The 3 line axes of a hexagonal board (used by Hexa Lines). */
export type HexAxis = 'q' | 'r' | 's';
