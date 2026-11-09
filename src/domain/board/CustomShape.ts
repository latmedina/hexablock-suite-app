import { toKey, type HexCoord } from '../geometry/HexCoord';
import type { IBoardShape } from './IHexBoard';

/** Snapshot of a finite shape; caller-owned coordinates cannot change its bounds. */
export class CustomShape implements IBoardShape {
  private readonly coordinates = new Map<string, HexCoord>();

  constructor(coords: Iterable<HexCoord>) {
    for (const coord of coords) {
      if (!Number.isSafeInteger(coord.q) || !Number.isSafeInteger(coord.r)) {
        throw new RangeError('Shape coordinates must be safe integers.');
      }
      this.coordinates.set(toKey(coord), Object.freeze({ q: coord.q, r: coord.r }));
    }
  }

  contains(coord: HexCoord): boolean {
    return this.coordinates.has(toKey(coord));
  }

  coords(): Iterable<HexCoord> {
    return this.coordinates.values();
  }
}
