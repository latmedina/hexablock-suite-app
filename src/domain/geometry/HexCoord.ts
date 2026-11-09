/**
 * Axial hex coordinate (q, r). The third cube coordinate is s = -q - r.
 * Reference: https://www.redblobgames.com/grids/hexagons/
 * DRAFT (P1): to be agreed by the whole team before implementation.
 */
export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

/** The 6 neighbour directions of a pointy/flat hex grid, in counter-clockwise screen order (E, NE, NW, W, SW, SE). */
export type HexDirection = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE';

/** The 3 line axes of a hexagonal board (used by Hexa Lines). */
export type HexAxis = 'q' | 'r' | 's';

/** Branded string key for a hex coordinate, format 'q,r'. */
export type HexCoordKey = string & { readonly __brand: unique symbol };

/** Convert a HexCoord to its string key 'q,r'. */
export const toKey = (c: HexCoord): HexCoordKey => `${c.q},${c.r}` as HexCoordKey;

/** Convert a string key 'q,r' back to a HexCoord. */
export const fromKey = (k: HexCoordKey): HexCoord => {
  const parts = k.split(',');
  const q = Number(parts[0]);
  const r = Number(parts[1]);
  return { q, r };
};
