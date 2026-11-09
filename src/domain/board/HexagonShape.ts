import type { HexCoord } from '../geometry/HexCoord';
import { HexGeometry } from '../geometry/HexGeometry';
import type { IBoardShape } from './IHexBoard';

export class HexagonShape implements IBoardShape {
  constructor(readonly radius: number) {
    if (!Number.isSafeInteger(radius) || radius < 0) throw new RangeError('Radius must be a non-negative safe integer.');
  }

  contains(coord: HexCoord): boolean {
    return Number.isSafeInteger(coord.q) && Number.isSafeInteger(coord.r)
      && HexGeometry.distance({ q: 0, r: 0 }, coord) <= this.radius;
  }

  *coords(): Iterable<HexCoord> {
    for (let q = 0 - this.radius; q <= this.radius; q++) {
      const first = Math.max(0 - this.radius, -q - this.radius);
      const last = Math.min(this.radius, -q + this.radius);
      for (let r = first; r <= last; r++) yield { q, r };
    }
  }
}
