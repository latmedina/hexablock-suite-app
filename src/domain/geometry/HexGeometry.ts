import { HexCoord } from './HexCoord';

export class HexGeometry {
  static readonly directions: ReadonlyArray<HexCoord> = [
    { q: 1, r: 0 },   // E
    { q: 1, r: -1 },  // NE
    { q: 0, r: -1 },  // NW
    { q: -1, r: 0 },  // W
    { q: -1, r: 1 },  // SW
    { q: 0, r: 1 }    // SE
  ];

  static distance(a: HexCoord, b: HexCoord): number {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    const ds = (-a.q - a.r) - (-b.q - b.r);
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
  }

  static neighbors(center: HexCoord): ReadonlyArray<HexCoord> {
    return this.directions.map(dir => this.add(center, dir));
  }

  static neighbor(center: HexCoord, directionIndex: number): HexCoord {
    if (directionIndex < 0 || directionIndex >= this.directions.length) {
      throw new RangeError(`directionIndex must be 0..5, got ${directionIndex}`);
    }
    const dir = this.directions[directionIndex];
    if (dir === undefined) {
      throw new RangeError(`directionIndex must be 0..5, got ${directionIndex}`);
    }
    return this.add(center, dir);
  }

  static rotate60CW(coord: HexCoord, center: HexCoord = { q: 0, r: 0 }): HexCoord {
    // Cube rotation (q, r, s) -> (-r, -s, -q) where s = -q - r
    // -s = -(-q - r) = q + r
    const relative = this.subtract(coord, center);
    return this.add({ q: -relative.r, r: relative.q + relative.r }, center);
  }

  static add(a: HexCoord, b: HexCoord): HexCoord {
    return { q: a.q + b.q, r: a.r + b.r };
  }

  static subtract(a: HexCoord, b: HexCoord): HexCoord {
    return { q: a.q - b.q, r: a.r - b.r };
  }

  static scale(coord: HexCoord, k: number): HexCoord {
    return { q: coord.q * k, r: coord.r * k };
  }
}
