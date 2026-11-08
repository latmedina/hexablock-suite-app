# Spec P2 — Hex geometry and generic board

- Owner: @latmedina (I1)
- Layer(s): domain
- Status: draft, to be approved by the owner before implementation

## Goal

One implementation of hexagonal geometry and of `HexBoard<TCell>` that the four variants reuse
without changes. Everything else in the engine depends on it, so it is tested first.

## Interfaces involved

- `src/domain/geometry/HexCoord.ts` — `HexCoord`, `HexDirection`, `HexAxis` (exist as drafts).
- `src/domain/board/IHexBoard.ts` — `IBoardShape`, `IHexBoard<TCell>` (exist as drafts).
- To create: `HexGeometry` (pure functions or a stateless class), `HexagonShape(radius)`,
  `CustomShape(coords)`, `HexBoard<TCell>` (immutable implementation of `IHexBoard<TCell>`).

## Rules and edge cases

- Axial `(q, r)`, cube `s = -q - r`, pointy-top, screen y downwards (see `src/domain/AGENTS.md`).
- Direction deltas: E (+1, 0), NE (+1, -1), NW (0, -1), W (-1, 0), SW (-1, +1), SE (0, +1).
  **Open point:** the draft comment in `HexCoord.ts` says the list is clockwise, but E → NE → NW → W → SW → SE
  is counter-clockwise on screen. Fix the comment or the order before implementing.
- Distance `max(|dq|, |dr|, |ds|)`; hexagon of radius N has `3N(N+1) + 1` cells.
- Rotation 60° clockwise around a center: translate, apply `(q, r, s) -> (-r, -s, -q)`, translate back.
  Six rotations return the original coordinate.
- `neighbours()` only returns coordinates inside the shape (border cells have fewer than 6).
- `line(axis, index)` walks a full line of constant q, r or s in a fixed order; lines get shorter towards the border.
- `ring(center, k)` has `6k` cells for k ≥ 1 and 1 cell for k = 0 (inside an unbounded shape).
- `with()` never mutates; `get()` outside the shape returns `undefined`; `with()` outside the shape throws.
- Coordinate keys are built in one place only (avoids the x/y swap bug seen in the previous semester's project).

## Acceptance criteria (become test names)

- should_have_19_cells_when_hexagon_radius_is_2
- should_have_61_cells_when_hexagon_radius_is_4
- should_return_6_neighbours_when_cell_is_interior
- should_return_3_neighbours_when_cell_is_a_corner_of_radius_2_hexagon
- should_return_origin_when_rotating_six_times_by_60_degrees
- should_match_known_coordinate_when_rotating_clockwise_once
- should_return_distance_2_when_cells_are_two_steps_apart
- should_return_9_cells_when_walking_centre_line_of_q_axis_on_radius_4
- should_return_12_cells_when_walking_ring_2
- should_keep_original_board_unchanged_when_with_is_called
- should_return_undefined_when_getting_coordinate_outside_shape
- should_throw_when_setting_coordinate_outside_shape
- should_contain_only_listed_coords_when_shape_is_custom_figure
- should_work_with_any_cell_type_when_board_uses_fake_cell

## Out of scope

Rendering (`BoardRenderer`, P8), pieces and their rotation as a group (P3/P5), variant rules (P4/P5).
