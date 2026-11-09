import { CustomShape, HexagonShape, HexBoard } from '../../../src/domain/board';
import { HexGeometry } from '../../../src/domain/geometry/HexGeometry';
import { toKey, type HexAxis, type HexCoord, type HexDirection } from '../../../src/domain/geometry/HexCoord';
import type { FakeCell } from '../../doubles/FakeCell';

const origin = { q: 0, r: 0 };

describe('generic hex board', () => {
  it('should_have_19_cells_when_hexagon_radius_is_2', () => {
    // Arrange
    const shape = new HexagonShape(2);
    // Act
    const coords = [...shape.coords()];
    // Assert
    expect(coords).toHaveLength(19);
    expect(new Set(coords.map(toKey)).size).toBe(19);
    expect(coords.every(coord => shape.contains(coord))).toBe(true);
  });

  it('should_have_61_cells_when_hexagon_radius_is_4', () => {
    // Arrange
    const shape = new HexagonShape(4);
    // Act
    const coords = [...shape.coords()];
    // Assert
    expect(coords).toHaveLength(61);
  });

  it('should_contain_only_origin_when_hexagon_radius_is_zero', () => {
    // Arrange
    const shape = new HexagonShape(0);
    // Act
    const coords = [...shape.coords()];
    // Assert
    expect(coords).toEqual([origin]);
    expect(shape.contains({ q: 1, r: 0 })).toBe(false);
  });

  it('should_reject_invalid_radii_when_shape_is_created', () => {
    // Arrange
    const radii = [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1];
    // Act
    const create = (radius: number) => new HexagonShape(radius);
    // Assert
    for (const radius of radii) expect(() => create(radius)).toThrow(RangeError);
  });

  it('should_return_6_neighbours_when_cell_is_interior', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(2));
    // Act
    const neighbours = [...board.neighbours(origin)];
    // Assert
    expect(neighbours).toEqual(HexGeometry.neighbors(origin));
  });

  it('should_return_3_neighbours_when_cell_is_a_corner_of_radius_2_hexagon', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(2));
    // Act
    const neighbours = [...board.neighbours({ q: 2, r: 0 })];
    // Assert
    expect(neighbours).toHaveLength(3);
    expect(neighbours.every(coord => board.shape.contains(coord))).toBe(true);
  });

  it('should_return_9_cells_when_walking_centre_line_of_q_axis_on_radius_4', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(4));
    // Act
    const coords = [...board.line('q', 0)];
    // Assert
    expect(coords).toHaveLength(9);
    expect(coords[0]).toEqual({ q: 0, r: -4 });
    expect(coords[8]).toEqual({ q: 0, r: 4 });
  });

  it('should_keep_constant_axis_and_shorten_edges_when_walking_all_line_axes', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(4));
    const axes: HexAxis[] = ['q', 'r', 's'];
    // Act
    const lines = axes.map(axis => ({ axis, center: [...board.line(axis, 0)], edge: [...board.line(axis, 4)] }));
    // Assert
    for (const { axis, center, edge } of lines) {
      expect(center).toHaveLength(9);
      expect(edge).toHaveLength(5);
      expect(edge.every(coord => (axis === 's' ? -coord.q - coord.r : coord[axis]) === 4)).toBe(true);
      expect([...board.line(axis, 5)]).toEqual([]);
    }
  });

  it('should_return_12_cells_when_walking_ring_2', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(4));
    // Act
    const ring = [...board.ring(origin, 2)];
    // Assert
    expect(ring).toHaveLength(12);
    expect(new Set(ring.map(toKey)).size).toBe(12);
    expect(ring.every(coord => HexGeometry.distance(origin, coord) === 2)).toBe(true);
  });

  it('should_clip_shifted_ring_when_ring_crosses_board_boundary', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(2));
    const center = { q: 2, r: 0 };
    // Act
    const ring = [...board.ring(center, 2)];
    const expected = [...board.shape.coords()].filter(coord => HexGeometry.distance(center, coord) === 2);
    // Assert
    expect(ring.map(toKey).sort()).toEqual(expected.map(toKey).sort());
    expect(ring.length).toBeGreaterThan(0);
    expect(ring.length).toBeLessThan(12);
  });

  it('should_return_only_center_when_ring_radius_is_zero', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(2));
    // Act
    const ring = [...board.ring(origin, 0)];
    // Assert
    expect(ring).toEqual([origin]);
    expect([...board.ring({ q: 4, r: 0 }, 0)]).toEqual([]);
  });

  it('should_reject_invalid_radii_when_ring_is_requested', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(2));
    // Act
    const ring = (radius: number) => [...board.ring(origin, radius)];
    // Assert
    for (const radius of [-1, 0.5, Infinity, NaN]) expect(() => ring(radius)).toThrow(RangeError);
    expect(ring(Number.MAX_SAFE_INTEGER)).toEqual([]);
  });

  it('should_keep_original_board_unchanged_when_with_is_called', () => {
    // Arrange
    const original = new HexBoard<number>(new HexagonShape(2));
    // Act
    const first = original.with(origin, 1);
    const second = first.with(origin, 2);
    const cleared = second.with(origin, undefined);
    // Assert
    expect(original.get(origin)).toBeUndefined();
    expect(first.get(origin)).toBe(1);
    expect(second.get(origin)).toBe(2);
    expect(cleared.isEmpty(origin)).toBe(true);
    expect(first).not.toBe(original);
  });

  it('should_return_undefined_when_getting_coordinate_outside_shape', () => {
    // Arrange
    const board = new HexBoard<number>(new HexagonShape(2));
    // Act
    const cell = board.get({ q: 3, r: 0 });
    // Assert
    expect(cell).toBeUndefined();
  });

  it('should_throw_when_setting_coordinate_outside_shape', () => {
    // Arrange
    const board = new HexBoard<number>(new HexagonShape(2));
    // Act
    const setOutside = () => board.with({ q: 3, r: 0 }, 7);
    // Assert
    expect(setOutside).toThrow(RangeError);
    expect(() => board.with({ q: 0.5, r: 0 }, 7)).toThrow(RangeError);
  });

  it('should_preserve_falsy_values_when_cell_is_not_undefined', () => {
    // Arrange
    const empty = new HexBoard<number | boolean | string>(new HexagonShape(0));
    // Act
    const boards = [empty.with(origin, 0), empty.with(origin, false), empty.with(origin, '')];
    // Assert
    expect(boards.map(board => board.isEmpty(origin))).toEqual([false, false, false]);
    expect(boards.map(board => board.get(origin))).toEqual([0, false, '']);
  });

  it('should_contain_only_listed_coords_when_shape_is_custom_figure', () => {
    // Arrange
    const coords = [origin, { q: 1, r: 0 }, { q: -1, r: 1 }];
    const shape = new CustomShape([...coords, origin]);
    // Act
    const actual = [...shape.coords()];
    // Assert
    expect(actual).toEqual(coords);
    expect(shape.contains({ q: 0, r: 1 })).toBe(false);
    expect(shape.contains({ q: -1, r: 1 })).toBe(true);
  });

  it('should_preserve_board_bounds_when_caller_changes_custom_shape_inputs', () => {
    // Arrange
    const mutable = { q: 0, r: 0 };
    const coords = [mutable];
    const custom = { contains: () => true, coords: () => coords };
    const board = new HexBoard<number>(custom);
    // Act
    mutable.q = 9;
    coords.push({ q: 1, r: 0 });
    // Assert
    expect([...board.shape.coords()]).toEqual([origin]);
    expect(board.shape.contains(origin)).toBe(true);
    expect(board.shape.contains({ q: 9, r: 0 })).toBe(false);
    expect(board.shape.contains({ q: 1, r: 0 })).toBe(false);
  });

  it('should_reject_invalid_coords_when_custom_shape_is_created', () => {
    // Arrange
    const invalid = [{ q: NaN, r: 0 }, { q: 0, r: Infinity }, { q: 0.5, r: 0 }];
    // Act
    const create = (coord: HexCoord) => new CustomShape([coord]);
    // Assert
    for (const coord of invalid) expect(() => create(coord)).toThrow(RangeError);
  });

  it('should_return_empty_iterators_when_shape_is_empty', () => {
    // Arrange
    const board = new HexBoard(new CustomShape([]));
    // Act
    const coords = [...board.shape.coords(), ...board.neighbours(origin), ...board.line('q', 0), ...board.ray(origin, 'E'), ...board.ring(origin, 0)];
    // Assert
    expect(coords).toEqual([]);
    expect(() => board.with(origin, 'cell')).toThrow(RangeError);
  });

  it('should_stop_before_holes_when_ray_crosses_disconnected_shape', () => {
    // Arrange
    const board = new HexBoard(new CustomShape([origin, { q: 1, r: 0 }, { q: 3, r: 0 }]));
    // Act
    const ray = [...board.ray(origin, 'E')];
    // Assert
    expect(ray).toEqual([{ q: 1, r: 0 }]);
    expect([...board.ray({ q: -1, r: 0 }, 'E')]).toEqual([]);
  });

  it('should_exclude_origin_and_follow_direction_when_ray_is_requested', () => {
    // Arrange
    const board = new HexBoard(new HexagonShape(2));
    const directions: HexDirection[] = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];
    // Act
    const rays = directions.map(direction => [...board.ray(origin, direction)]);
    // Assert
    rays.forEach((ray, index) => {
      const neighbour = HexGeometry.neighbor(origin, index);
      expect(ray).toEqual([neighbour, HexGeometry.scale(neighbour, 2)]);
    });
  });

  it('should_copy_board_structure_when_clone_is_updated', () => {
    // Arrange
    const original = new HexBoard<number>(new HexagonShape(1)).with(origin, 7);
    // Act
    const copy = original.clone();
    const modified = copy.with(origin, 8);
    // Assert
    expect(copy).not.toBe(original);
    expect(copy.get(origin)).toBe(7);
    expect(original.get(origin)).toBe(7);
    expect(modified.get(origin)).toBe(8);
  });

  it('should_work_with_any_cell_type_when_board_uses_fake_cell', () => {
    // Arrange
    const board = new HexBoard<FakeCell>(new HexagonShape(1));
    const cell: FakeCell = { label: 'generic' };
    // Act
    const next = board.with(origin, cell);
    // Assert
    expect(next.get(origin)).toBe(cell);
    expect(board.isEmpty(origin)).toBe(true);
  });

  it('should_return_origin_when_rotating_six_times_by_60_degrees', () => {
    // Arrange
    const start = { q: 2, r: -1 };
    // Act
    let rotated = start;
    for (let i = 0; i < 6; i++) rotated = HexGeometry.rotate60CW(rotated);
    // Assert
    expect(rotated).toEqual(start);
  });

  it('should_rotate_about_given_center_when_center_is_not_origin', () => {
    // Arrange
    const center = { q: 3, r: -2 };
    const coord = { q: 4, r: -2 };
    // Act
    const rotated = HexGeometry.rotate60CW(coord, center);
    // Assert
    expect(rotated).toEqual({ q: 3, r: -1 });
    expect(HexGeometry.distance(rotated, center)).toBe(1);
  });
});
