import { toKey, type HexAxis, type HexCoord, type HexDirection } from '../geometry/HexCoord';
import { HexGeometry } from '../geometry/HexGeometry';
import { CustomShape } from './CustomShape';
import type { IBoardShape, IHexBoard } from './IHexBoard';

const DIRECTIONS: Record<HexDirection, number> = { E: 0, NE: 1, NW: 2, W: 3, SW: 4, SE: 5 };
const coordinateOrder = (a: HexCoord, b: HexCoord) => a.q - b.q || a.r - b.r;

/** Immutable board structure; TCell values are shared, so callers should use immutable cells. */
export class HexBoard<TCell> implements IHexBoard<TCell> {
  readonly shape: IBoardShape;
  private readonly cells = new Map<string, TCell>();

  constructor(shape: IBoardShape) {
    this.shape = new CustomShape(shape.coords());
  }

  get(coord: HexCoord): TCell | undefined {
    return this.shape.contains(coord) ? this.cells.get(toKey(coord)) : undefined;
  }

  with(coord: HexCoord, cell: TCell | undefined): HexBoard<TCell> {
    if (!this.shape.contains(coord)) throw new RangeError('Coordinate is outside the board shape.');
    const next = this.clone();
    if (cell === undefined) next.cells.delete(toKey(coord));
    else next.cells.set(toKey(coord), cell);
    return next;
  }

  isEmpty(coord: HexCoord): boolean {
    return this.get(coord) === undefined;
  }

  neighbours(coord: HexCoord): Iterable<HexCoord> {
    return HexGeometry.neighbors(coord).filter(next => this.shape.contains(next));
  }

  line(axis: HexAxis, index: number): Iterable<HexCoord> {
    return [...this.shape.coords()]
      .filter(coord => (axis === 's' ? -coord.q - coord.r : coord[axis]) === index)
      .sort(coordinateOrder);
  }

  *ray(from: HexCoord, direction: HexDirection): Iterable<HexCoord> {
    if (!this.shape.contains(from)) return;
    let next = HexGeometry.neighbor(from, DIRECTIONS[direction]);
    while (this.shape.contains(next)) {
      yield next;
      next = HexGeometry.neighbor(next, DIRECTIONS[direction]);
    }
  }

  ring(center: HexCoord, radius: number): Iterable<HexCoord> {
    if (!Number.isSafeInteger(radius) || radius < 0) throw new RangeError('Radius must be a non-negative safe integer.');
    // Filter the finite shape: distant or clipped rings never need an unbounded grid walk.
    return [...this.shape.coords()].filter(coord => HexGeometry.distance(center, coord) === radius).sort(coordinateOrder);
  }

  clone(): HexBoard<TCell> {
    const copy = new HexBoard<TCell>(this.shape);
    for (const [key, value] of this.cells) copy.cells.set(key, value);
    return copy;
  }
}
