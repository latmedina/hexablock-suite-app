# Module: domain core (geometry, board, engine) — owner @latmedina

Layer 1. Also read the root `AGENTS.md`.

## Scope

`geometry/`, `board/`, `engine/`, `commands/`, `capabilities/`, `pieces/`, `scoring/`, `IVariantFactory.ts`.
Variant folders have their own rules in `variants/AGENTS.md`.

## Rules

1. Pure TypeScript only: no imports outside `src/domain`, no npm packages, no React, no `Date.now()` or
   `Math.random()` (inject a clock or an `IRandomSeeded` source).
2. Nothing here may know a variant: no `if`/`switch` on a game id, no import from `variants/`.
3. Generic types carry the variation (`HexBoard<TCell>`, `IGameRules<TCell, TMove, TState>`). Every
   constraint (`TCell extends IMergeable<TCell>`) needs a one-line reason in a comment and in the README.
4. Immutable state: operations return new objects (`IHexBoard.with()`), which makes undo and Prototype cheap.

## Hex conventions (single source of truth — do not redefine elsewhere)

- Axial coordinates `(q, r)`; cube `s = -q - r`. Pointy-top layout, screen y grows downwards.
- Directions as axial deltas: `E (+1, 0)`, `NE (+1, -1)`, `NW (0, -1)`, `W (-1, 0)`, `SW (-1, +1)`, `SE (0, +1)`.
- Distance = `max(|dq|, |dr|, |ds|)`. Hexagon of radius N = all coords with distance ≤ N from the
  origin: `3N(N+1) + 1` cells (radius 2 = 19, radius 4 = 61).
- The 3 axes are lines of constant `q`, constant `r` and constant `s`.
- Rotation by 60° on cube coords: clockwise `(q, r, s) -> (-r, -s, -q)`.
- Details and acceptance tests: `docs/specs/P2-hex-geometry.md`.

## Does not exist yet

Only draft interfaces exist (`HexCoord`, `IHexBoard`, `IGameRules`, `IGameEngine`, `IPieceSource`,
`IScoringPolicy`, `IProgressModel`, `IMoveCommand`, capabilities). There is no implementation of any
of them yet. Do not assume methods that are not in those files.
